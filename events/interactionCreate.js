import fs from 'fs';

const once = false;
const name = 'interactionCreate';

// Define a list of whitelisted user IDs
const WHITELISTED_USER_IDS = ['329411181582483456', '134775482930429952', '289136609520254976', '574609789653483521']; // Replace with actual user IDs

async function invoke(interaction) {
    // Check if the interaction is a command
    if (interaction.isChatInputCommand()) {
            if (!WHITELISTED_USER_IDS.includes(interaction.user.id)) {
                return interaction.reply('Sorry, you are not authorized to use this command');
            }
        try {
            // Dynamically import the command file based on the command name
            const commandFile = await import(`../events/commands/${interaction.commandName}.js`);

            // Check if the command file has an 'invoke' method
            if (commandFile && commandFile.invoke) {
                // Call the invoke function from the dynamically loaded command file
                await commandFile.invoke(interaction);
            } else {
                console.error(`Command ${interaction.commandName} does not have an 'invoke' function`);
                interaction.reply('This command has no handler!');
            }
        } catch (error) {
            console.error(`Error loading command ${interaction.commandName}:`, error);
            interaction.reply('There was an error processing your request!');
        }
    }
}

export { once, name, invoke };
