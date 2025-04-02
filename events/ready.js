import fs from 'fs';

const once = true;
const name = 'ready';

async function invoke(client) {
    console.log('Starting dynamic command registration...');

    try {
        // Get all command files from the 'commands' directory
        const commandFiles = fs
            .readdirSync('./events/commands') // This should match where your command files are located
            .filter((file) => file.endsWith('.js')) // Only select JS files
            .map((file) => file.slice(0, -3)); // Remove '.js' extension for each file

        const commandsArray = [];

        // Dynamically import each command file
        for (let command of commandFiles) {
            console.log(`Importing command: ${command}`);
            const commandFile = await import(`../events/commands/${command}.js`);
            
            if (commandFile.create) {
                console.log(`Successfully imported: ${command}`);
                commandsArray.push(commandFile.create());
            } else {
                console.error(`Error: create method missing in ${command}`);
            }
        }

        // Register the commands with Discord
        console.log('Registering dynamic global commands...');
        await client.application.commands.set(commandsArray);

        console.log('Successfully registered commands!');
        console.log(`Logged in as ${client.user.tag}`);
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

export { once, name, invoke };
