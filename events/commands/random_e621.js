import { SlashCommandBuilder } from 'discord.js';
import axios from 'axios';

const create = () => {
    const command = new SlashCommandBuilder()
        .setName('random_e621')
        .setDescription('Replies with a random (filtered) post from e621.net')
        .addStringOption(option =>
            option.setName('rating')
                .setDescription('Rating of the post')
                .setRequired(false)
                .addChoices(
                    { name: 'Safe', value: 'rating:safe' },
                    { name: 'Questionable', value: 'rating:questionable' },
                    { name: 'Explicit', value: 'rating:explicit' }
                )
        );

    const commandJSON = command.toJSON();
    commandJSON.integration_types = [0, 1];
    commandJSON.contexts = [1, 2];

    return commandJSON;
};

const getE621Post = async (rating, retries = 3) => {
    let baseTags = 'score:>=500 -young -scat -gore';
    if (rating) baseTags += ` ${rating}`;

    const url = `https://e621.net/posts/random.json?tags=${encodeURIComponent(baseTags)}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'DiscordBot/1.0 (by AFlusteredFox2)',
                    'Accept': 'application/json'
                }
            });

            return response.data.post ?? null;

        } catch (error) {
            console.warn(`e621 fetch attempt ${attempt} failed.`);
            if (attempt === retries) {
                console.error('All fetch attempts failed:', error);
            }
        }
    }

    return null;
};

const invoke = async (interaction) => {
    try {
        await interaction.deferReply();
        const rating = interaction.options.getString('rating');

        const timeout = setTimeout(() => {
            if (!interaction.replied) {
                interaction.editReply('⏳ Still fetching post... Please wait.');
            }
        }, 2500);

        const post = await getE621Post(rating);
        clearTimeout(timeout);

        if (!post) {
            await interaction.editReply('❌ Failed to fetch post from e621.');
            return;
        }

        await interaction.editReply(`Here's your post:\n` + `https://e621.net/posts/${post.id}`);

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
