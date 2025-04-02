import fs from 'fs';

const once = true;
const name = 'ready';

async function invoke(client) {
    console.log('Starting dynamic command registration...');

    try {
        // Get all command files
        const commands = fs
            .readdirSync('./events/commands')
            .filter((file) => file.endsWith('.js'))
            .map((file) => file.slice(0, -3));

        const commandsArray = [];

        // Import each command dynamically
        for (let command of commands) {
            const commandFile = await import(`../events/commands/${command}.js`);
            commandsArray.push(commandFile.create());
        }

        console.log('Registering dynamic global commands...');
        await client.application.commands.set(commandsArray);

        console.log('Successfully registered commands!');
        console.log(`Logged in as ${client.user.tag}`);
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

export { once, name, invoke };
