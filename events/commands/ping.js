import { SlashCommandBuilder } from 'discord.js';

// Creates an object with the data required by Discord's API to create a SlashCommand
const create = () => {
	const command = new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong! (used to ensure bot is responding)')
		.addUserOption((option) =>
			option.setName('user').setDescription('Greet someone?')
		);

	return command.toJSON();
};

// Called by the interactionCreate event listener when the corresponding command is invoked
const invoke = (interaction) => {
	const user = interaction.options.getUser('user');

	if (user !== null) {
		interaction.reply({ content: `Hey ${user}!` });
	} else {
		interaction.reply({
			content: 'Pong!',
			ephemeral: true,
		});
	}
};

export { create, invoke };
