import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import axios from 'axios';

const create = () => {
    const command = new SlashCommandBuilder()
        .setName('random_e621_tagged')
        .setDescription('Replies with a random post from e621.net with a custom tag and rating')
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
        );

    const commandJSON = command.toJSON();
    commandJSON.integration_types = [0, 1];
    commandJSON.contexts = [1, 2];

    return commandJSON;
};

async function getE621PostWithTagAndRating(extraTag, rating, retries = 3) {
    const safeBaseTags = 'score:>=0 -young -scat -gore';
    let query = `${safeBaseTags}`;
    if (rating) query += ` ${rating}`;
    if (extraTag) query += ` ${extraTag.trim()}`;

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
}

const invoke = async (interaction) => {
    try {
        await interaction.deferReply();

        const tag = interaction.options.getString('tag');
        const rating = interaction.options.getString('rating');

        const timeout = setTimeout(() => {
            if (!interaction.replied) {
                interaction.editReply('⏳ Still fetching post... Please wait.');
            }
        }, 2500);

        const post = await getE621PostWithTagAndRating(tag, rating);

        clearTimeout(timeout);

        if (!post) {
            await interaction.editReply('❌ Failed to fetch post from e621.');
            return;
        }

        const postUrl = `https://e621.net/posts/${post.id}`;
        const embed = new EmbedBuilder()
            .setTitle(`e621 Post #${post.id}`)
            .setURL(postUrl)
            .setImage(post?.file?.url || null)
            .setFooter({ text: `Score: ${post.score.total} | Rating: ${post.rating.toUpperCase()}` });

        await interaction.editReply({ content: 'Here\'s your post:\n', embeds: [embed] });

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
