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
