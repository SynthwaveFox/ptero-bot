import fs from 'fs';  // To read command files dynamically

const once = false; // You can keep this as false if you want it to be non-episodic
const name = 'interactionCreate';

async function invoke(interaction) {
    // Check if the interaction is a command
    if (interaction.isChatInputCommand()) {
        // Dynamically load the command file based on the command name
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
