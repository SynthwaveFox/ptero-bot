import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import axios from 'axios';

const create = () => {
    const command = new SlashCommandBuilder()
        .setName('server_status')
        .setDescription('Gets the current power states of all gameservers.');

    return command.toJSON();
};

const API_KEY = process.env.PTERO_TOKEN;
const SERVER_IDS = [
    '2cf9a7ff-d770-4649-86fb-617cb08e10b6',
    '5c0b3278-3d1b-4faa-b532-705f1f83516d',
    '17f4e985-dae0-4c8c-97a1-a352f9fdbcad'
];

const SERVER_NAMES = {
    '2cf9a7ff-d770-4649-86fb-617cb08e10b6': 'Minecraft-Forge',
    '5c0b3278-3d1b-4faa-b532-705f1f83516d': 'Minecraft-Vanilla',
    '17f4e985-dae0-4c8c-97a1-a352f9fdbcad': 'Satisfactory',
};

// This function fetches the power state for a given server
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

        // Get the current state and capitalize it
        const state = response.data.attributes.current_state.toUpperCase();

        // Return the state and serverId
        return { serverId, state };
    } catch (error) {
        console.error(`Error fetching state for ${serverId}:`, error);
        return { serverId, state: 'UNKNOWN' }; // Return 'UNKNOWN' on error
    }
}

// This function fetches the state for all servers and formats the embed message
async function checkAllServers(interaction) {
    // Check if the user has the required role
    if (!interaction.member.roles.cache.has('722640858809106432')) {
        return interaction.reply({
            content: 'You do not have permission to use this command.',
            ephemeral: true
        });
    }

    const results = await Promise.all(SERVER_IDS.map(getServerPowerState));

    const embed = new EmbedBuilder()
        .setColor(0xFF8A00)
        .setTitle('Server Power States')
        .setDescription('Here are the current power states of all the game servers:');

    results.forEach(({ serverId, state }) => {
        // Get the human-readable server name
        const serverName = SERVER_NAMES[serverId] || `Unknown Server (${serverId})`;

        // Decide the emoji based on the server state
        const emoji = state === 'RUNNING' ? ':white_check_mark:' : ':warning:';
        
        // Push the server status to the embed fields
        embed.addFields({
            name: serverName,
            value: `${emoji} ${state}`,
            inline: true
        });
    });

    // Send the embed to the interaction channel
    interaction.reply({ embeds: [embed] });
}

// Called by the interactionCreate event listener when the corresponding command is invoked
const invoke = (interaction) => {
    checkAllServers(interaction);
};

export { create, invoke };
