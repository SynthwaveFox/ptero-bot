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

    response.data.data.forEach(server => {
    
      var power_state = getServerPowerState(server.attributes.identifier);
      if (power_state === "running" || power_state === "starting") {
        totalMemory += server.attributes.limit.memory
      }
    
    });

  }
}
