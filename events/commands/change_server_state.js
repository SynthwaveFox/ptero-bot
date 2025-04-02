import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import axios from 'axios';
import { SERVER_IDS, SERVER_NAMES } from '../../config.js';

const API_KEY = process.env.PTERO_TOKEN;

// Get the node's total memory and current usage
async function getNodeResources() {
  const url = `https://panel.snfx.dev/api/application/nodes/1`;
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${process.env.PTERO_APPLICATION_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log('Node Resources:', response.data.attributes.memory);  // Log node's total memory
    return { maxMemory: response.data.attributes.memory }; // Max available memory
  } catch (error) {
    console.error('Error fetching node resources:', error);
    return { maxMemory: 0 }; // If error occurs, return 0 as max memory
  }
}

// Get current power state of a server
async function getServerPowerState(serverId) {
  const url = `https://panel.snfx.dev/api/client/servers/${serverId}/resources`;
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log(`Server ${serverId} Power State:`, response.data.attributes.current_state);  // Log server power state
    return response.data.attributes.current_state;
  } catch (error) {
    console.error(`Error fetching state for ${serverId}:`, error);
    return 'unknown'; // Return 'unknown' on error
  }
}

// Get total memory used by running servers
async function getRunningServersMemory() {
  try {
    const url = `https://panel.snfx.dev/api/application/servers`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${process.env.PTERO_APPLICATION_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    let totalMemory = 0;
    for (const server of response.data.data) {
      const state = await getServerPowerState(server.attributes.identifier);
      if (state === 'running' || state === 'starting') {
        totalMemory += server.attributes.limits.memory; // Accumulate memory usage of running servers
      }
    }
    console.log('Total Running Servers Memory:', totalMemory);  // Log the total memory used by running servers
    return totalMemory;
  } catch (error) {
    console.error('Error fetching running servers:', error);
    return 0;
  }
}

// Get the memory requirement for a specific server
async function getServerMemoryRequirement(serverId) {
  try {
    const url = `https://panel.snfx.dev/api/client/servers/${serverId}`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log(`Server ${serverId} Memory Requirement:`, response.data.attributes.limits.memory);  // Log the server's memory requirement
    return response.data.attributes.limits.memory; // Return memory required by the server
  } catch (error) {
    console.error(`Error fetching memory requirement for ${serverId}:`, error);
    return 0; // Return 0 if there's an error fetching the memory requirement
  }
}

// Change the power state of a server
async function changeServerPowerState(serverId, state) {
  const url = `https://panel.snfx.dev/api/client/servers/${serverId}/power`;
  try {
    await axios.post(url, { signal: state }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log(`Server ${serverId} power state changed to ${state}.`);  // Log power state change
    return true;
  } catch (error) {
    console.error(`Error changing server power state for ${serverId}:`, error);
    return false;
  }
}

// Create the slash command for changing server state
const create = () => {
  return new SlashCommandBuilder()
    .setName('change_server_state')
    .setDescription('Change the power state of a server if there are enough resources.')
    .addStringOption(option =>
      option.setName('state')
        .setDescription('The power state to set (start, stop, restart, kill)')
        .setRequired(true)
        .addChoices(
          { name: 'Start', value: 'start' },
          { name: 'Stop', value: 'stop' },
          { name: 'Restart', value: 'restart' },
          { name: 'Kill', value: 'kill' }
        )
    )
    .addStringOption(option =>
      option.setName('server')
        .setDescription('The server to change power state for')
        .setRequired(true)
        .addChoices(...Object.entries(SERVER_NAMES).map(([id, name]) => ({ name, value: id })))
    ).toJSON();
};

// Invoke the slash command and add button interaction
const invoke = async (interaction) => {
  await interaction.deferReply({ ephemeral: true });
  const requestedState = interaction.options.getString('state');
  const serverId = interaction.options.getString('server');

  if (!SERVER_IDS.includes(serverId)) return interaction.editReply('Invalid server ID.');

  if (['start', 'restart'].includes(requestedState)) {
    const { maxMemory } = await getNodeResources();
    const runningMemory = await getRunningServersMemory();
    const availableMemory = maxMemory - runningMemory;

    // Get the memory requirement of the server to start
    const serverMemory = await getServerMemoryRequirement(serverId);

    // Log available memory and server memory requirements
    console.log(`Requested State: ${requestedState}`);
    console.log(`Max Memory: ${maxMemory}`);
    console.log(`Running Memory: ${runningMemory}`);
    console.log(`Available Memory: ${availableMemory}`);
    console.log(`Server ${serverId} Memory Requirement: ${serverMemory}`);

    if (availableMemory <= 0) {
      console.log('Not enough resources to start the server.');
      return interaction.editReply('Not enough resources to start the server.');
    }
    if (availableMemory < serverMemory) {
      console.log(`Not enough memory to start the server. Required: ${serverMemory}MB, Available: ${availableMemory}MB.`);
      return interaction.editReply(`Not enough memory to start the server. Stop another server or ask the administrator.`);
    }
  }

  const confirm = new ButtonBuilder().setCustomId(`confirm_${serverId}_${requestedState}`).setLabel('Confirm').setStyle(ButtonStyle.Success);
  const cancel = new ButtonBuilder().setCustomId(`cancel_${serverId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder().addComponents(confirm, cancel);

  await interaction.editReply({
    content: `⚠️ Are you sure you want to change the power state of "${SERVER_NAMES[serverId]}" to "${requestedState}"?`,
    components: [row],
  });
};

// Handle button interaction for confirm/cancel
const handleButtonInteraction = async (interaction) => {
  if (!interaction.isButton()) return;

  const [action, serverId, state] = interaction.customId.split('_');
  if (action === 'confirm') {
    await interaction.deferUpdate();
    const success = await changeServerPowerState(serverId, state);
    await interaction.editReply({
      content: success ? `✅ Server "${SERVER_NAMES[serverId]}" changed to "${state}" successfully.` : `❌ Failed to change state of "${SERVER_NAMES[serverId]}".`,
      components: []
    });
  } else if (action === 'cancel') {
    await interaction.deferUpdate();
    await interaction.editReply({
      content: `❌ Action canceled.`,
      components: []
    });
  }
};

export { create, invoke, handleButtonInteraction };
