import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import axios from 'axios';
import { SERVER_IDS, SERVER_NAMES } from '../../config.js';

const API_KEY = process.env.PTERO_TOKEN;

async function getNodeResources() {
  const url = `https://panel.snfx.dev/api/application/nodes/1`;  // URL for the node resource details
  
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${process.env.PTERO_APPLICATION_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const nodeResources = response.data.attributes;
    const maxMemory = nodeResources.memory; // Maximum available memory

    return { maxMemory };
  } catch (error) {
    console.error('Error fetching node resources:', error);
    return { maxMemory: 0 }; // Fallback if fetching fails
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

      // Get the current state and capitalize it
      const state = response.data.attributes.current_state.toUpperCase();

      // Return the state and serverId
      return { serverId, state };
  } catch (error) {
      console.error(`Error fetching state for ${serverId}:`, error);
      return { serverId, state: 'UNKNOWN' }; // Return 'UNKNOWN' on error
  }
}

async function getServerResources() {
  const url = `https://panel.snfx.dev/api/application/servers`;  // URL for the node resource details
  
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${process.env.PTERO_APPLICATION_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    let totalMemory = 0;

    // Get the state of each server and calculate total memory for servers that are "on"
    const statePromises = response.data.data.map(server => getServerPowerState(server.attributes.id));
    const states = await Promise.all(statePromises);

    // Iterate over servers and add memory if the server is "on"
    response.data.data.forEach(server => {
      const serverState = states.find(state => state.serverId === server.attributes.id);
      if (serverState && serverState.state === 'ON') { // Adjust 'ON' as per your server state value
        totalMemory += server.attributes.limits.memory;
      }
    });

    console.log('Total Memory of servers that are "on":', totalMemory);

    return totalMemory;
  
  } catch (error) {
    console.error('Error fetching server resources:', error);
    return 0; // Return 0 if there's an error
  }
}

export { getNodeResources, getServerResources };
