import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import axios from 'axios';

const create = () => {
    const command = new SlashCommandBuilder()
        .setName('random_e621')
        .setDescription('Replies with a random (filtered) post from e621.net');

    const commandJSON = command.toJSON();
    commandJSON.integration_types = [0, 1];
    commandJSON.contexts = [1, 2];

    return commandJSON;
};

const e6apikey = process.env.e6ApiKey;

async function getE621Post() {
    const url = `https://e621.net/posts/random.json?tags=score:%3E=500+-young+-scat`;

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'DiscordBot/1.0 (by AFlusteredFox2)', // Replace with your e621 username
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        return response.data.post?.file?.url ?? null;

    } catch (error) {
        console.error('Error fetching e621 post:', error);
        return null;
    }
}

const invoke = async (interaction) => {
    await interaction.deferReply();

    const mediaUrl = await getE621Post();

    if (!mediaUrl) {
        await interaction.editReply('❌ Failed to fetch post from e621.');
        return;
    }

    // Let Discord do the preview automatically
    await interaction.editReply(mediaUrl);
};

export { create, invoke };