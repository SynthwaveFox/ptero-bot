import { SlashCommandBuilder } from 'discord.js';
import axios from 'axios';

const create = () => {
    const command = new SlashCommandBuilder()
        .setName('random_e621_tagged')
        .setDescription('Replies with a random post from e621.net with a custom tag, rating, and restriction')
        .addStringOption(option =>
            option.setName('tag')
                .setDescription('An additional tag to include')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('rating')
                .setDescription('Rating of the post')
                .setRequired(false)
                .addChoices(
                    { name: 'Safe', value: 'rating:safe' },
                    { name: 'Questionable', value: 'rating:questionable' },
                    { name: 'Explicit', value: 'rating:explicit' }
                )
        )
        .addStringOption(option =>
            option.setName('restriction')
                .setDescription('Gender pairing restriction')
                .setRequired(false)
                .addChoices(
                    { name: 'Male / Female', value: 'male/female' },
                    { name: 'Male / Male', value: 'male/male' },
                    { name: 'Female / Female', value: 'female/female' },
                    { name: 'Male Solo', value: 'solo male' },
                    { name: 'Female Solo', value: 'solo female' }
                )
        );        

    const commandJSON = command.toJSON();
    commandJSON.integration_types = [0, 1];
    commandJSON.contexts = [1, 2];

    return commandJSON;
};

const getE621PostWithTagAndRating = async (extraTag, rating, restriction, retries = 3) => {
    const baseTags = 'score:>=0 -young -scat -gore';
    let query = baseTags;

    if (rating) query += ` ${rating}`;
    if (extraTag) query += ` ${extraTag.trim()}`;
    if (restriction) query += ` ${restriction}`

    const url = `https://e621.net/posts/random.json?tags=${encodeURIComponent(query)}`;

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

        const tag = interaction.options.getString('tag');
        const rating = interaction.options.getString('rating');
        const restriction = interaction.options.getString('restriction');

        const timeout = setTimeout(() => {
            if (!interaction.replied) {
                interaction.editReply('⏳ Still fetching post... Please wait.');
            }
        }, 2500);

        const post = await getE621PostWithTagAndRating(tag, rating, restriction);
        clearTimeout(timeout);

        if (!post) {
            await interaction.editReply('❌ Failed to fetch post from e621.');
            return;
        }

        await interaction.editReply(`Here's your post:\nhttps://e621.net/posts/${post.id}`);

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
