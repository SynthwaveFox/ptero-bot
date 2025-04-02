import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import axios from 'axios';
import { SERVER_IDS, SERVER_NAMES } from '../../config.js';

const API_KEY = process.env.PTERO_TOKEN;

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
    return { maxMemory: response.data.attributes.memory };
  } catch (error) {
    console.error('Error fetching node resources:', error);
    return { maxMemory: 0 };
  }
}

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
    return response.data.attributes.current_state;
  } catch (error) {
    console.error(`Error fetching state for ${serverId}:`, error);
    return 'unknown';
  }
}

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
        totalMemory += server.attributes.limits.memory;
      }
    }
    return totalMemory;
  } catch (error) {
    console.error('Error fetching running servers:', error);
    return 0;
  }
}

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
    return true;
  } catch (error) {
    console.error(`Error changing server power state:`, error);
    return false;
  }
}

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

const invoke = async (interaction) => {
  await interaction.deferReply({ ephemeral: true });
  const requestedState = interaction.options.getString('state');
  const serverId = interaction.options.getString('server');

  if (!SERVER_IDS.includes(serverId)) return interaction.editReply('Invalid server ID.');

  if (['start', 'restart'].includes(requestedState)) {
      const { maxMemory } = await getNodeResources();
      const runningMemory = await getRunningServersMemory();
      const availableMemory = maxMemory - runningMemory;
      if (availableMemory <= 0) return interaction.editReply('Not enough resources to start the server.');
  }

  const confirmId = `confirm_${serverId}_${requestedState}`;
  const cancelId = `cancel_${serverId}`;

  console.log(`Confirm button ID: ${confirmId}`);
  console.log(`Cancel button ID: ${cancelId}`);

  const confirm = new ButtonBuilder()
      .setCustomId(confirmId)
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success);
  const cancel = new ButtonBuilder()
      .setCustomId(cancelId)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder().addComponents(confirm, cancel);

  await interaction.editReply({
      content: `⚠️ Are you sure you want to change the power state of "${SERVER_NAMES[serverId]}" to "${requestedState}"?`,
      components: [row],
  });
};


const handleButtonInteraction = async (interaction) => {
  if (!interaction.isButton()) return;

  console.log(`Button pressed: ${interaction.customId}`);

  const [action, serverId, state] = interaction.customId.split('_');
  console.log(`Parsed Action: ${action}, Server ID: ${serverId}, State: ${state}`);

  await interaction.deferUpdate().catch(console.error);  // Ensure interaction is acknowledged

  if (action === 'confirm') {
    console.log(`Attempting to change state of ${serverId} to ${state}`);

    const success = await changeServerPowerState(serverId, state);

    console.log(`Power change success: ${success}`);

    await interaction.editReply({
      content: success ? `✅ Server "${SERVER_NAMES[serverId]}" changed to "${state}" successfully.` : `❌ Failed to change state of "${SERVER_NAMES[serverId]}".`,
      components: []
    }).catch(console.error);

  } else if (action === 'cancel') {
    console.log(`Action canceled for ${serverId}`);

    await interaction.editReply({
      content: `❌ Action canceled.`,
      components: []
    }).catch(console.error);
  }
};



export { create, invoke, handleButtonInteraction };
