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

async function getE621Post(retries = 3) {
    const url = `https://e621.net/posts/random.json?tags=score:%3E=500+-young+-scat`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'DiscordBot/1.0 (by your_username_here on e621)',
                    'Accept': 'application/json'
                }
            });

            return response.data.post?.file?.url ?? null;

        } catch (error) {
            console.warn(`e621 fetch attempt ${attempt} failed.`);
            if (attempt === retries) {
                console.error('All fetch attempts failed:', error);
            }
        }
    }

    return null;
}


const invoke = async (interaction) => {
    try {
        await interaction.deferReply(); // Start response timer

        const timeout = setTimeout(() => {
            if (!interaction.replied) {
                interaction.editReply('⏳ Still fetching post... Please wait.');
            }
        }, 2500); // Safety reply if fetch hangs

        const mediaUrl = await getE621Post();

        clearTimeout(timeout); // Cancel timeout once we have a result

        if (!mediaUrl) {
            await interaction.editReply('❌ Failed to fetch post from e621.');
            return;
        }

        await interaction.editReply("Here's your post:" + mediaUrl); // Send image/video URL

    } catch (err) {
        console.error('Interaction failed:', err);

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply('❌ Something went wrong.');
        } else {
            await interaction.reply('❌ Something went wrong before the reply could be sent.');
        }
    }
};


export { create, invoke };