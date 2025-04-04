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
                'User-Agent': 'DiscordBot/1.0 (by YOUR_USERNAME_HERE on e621)', // Replace with your e621 username
                'Authorization': `Basic ${Buffer.from(e6apikey).toString('base64')}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const post = response.data.post;
        return post.file.url;

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

    const embed = new EmbedBuilder()
        .setTitle('🎲 Random e621 Post')
        .setDescription(`[Click to view post](${mediaUrl})`)
        .setURL(mediaUrl)
        .setColor(0xFF8A00);

    await interaction.editReply({ embeds: [embed] });
};

export { create, invoke };
