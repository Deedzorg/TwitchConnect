let autoPokecatchEnabled = false;
let lastCatchTime = 0;
const CATCH_COOLDOWN = 5000;

function handlePokecatch(displayName, message, socket, channelName) {
    if (!autoPokecatchEnabled || Date.now() - lastCatchTime < CATCH_COOLDOWN) return;

    if (/A wild (.+) appears/i.test(message)) {
        console.log(`Attempting to catch a Pokémon in #${channelName}`);
        socket.send(`PRIVMSG #${channelName} :!pokecatch`);
        lastCatchTime = Date.now();
    }
}
