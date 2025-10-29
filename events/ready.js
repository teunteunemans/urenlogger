module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`\n✓ Logged in as ${client.user.tag}`);
    console.log(`✓ Serving ${client.guilds.cache.size} guild(s)`);
    console.log(`✓ Bot is ready!\n`);

    // Set bot activity
    client.user.setActivity("work hours", { type: "WATCHING" });
  },
};
