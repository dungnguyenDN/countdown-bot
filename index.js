const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Collection,
  SlashCommandBuilder,
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection,
} = require('@discordjs/voice');
const { token } = require('./config.json');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

let player;
let connection;

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  // Slash command: /countdown
  if (interaction.isChatInputCommand() && interaction.commandName === 'countdown') {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '❌ You must join a voice channel first.', ephemeral: true });
    }

    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    if (!player) {
      player = createAudioPlayer();
      connection.subscribe(player);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('count10').setLabel('🔟 Count 10 to 0').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('count20').setLabel('2️⃣0️⃣ Count 20 to 0').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('stop').setLabel('⏹ Stop').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('leave').setLabel('👋 Leave').setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: '🔊 Choose a countdown option:',
      components: [row],
    });
  }

  // Button interactions
  if (interaction.isButton()) {
    if (!interaction.member.voice.channel || !connection) {
      return interaction.reply({ content: '❌ Bot is not connected to a voice channel.', ephemeral: true });
    }

    if (!player) {
      player = createAudioPlayer();
      connection.subscribe(player);
    }

    if (interaction.customId === 'count10' || interaction.customId === 'count20') {
      const file = interaction.customId === 'count10' ? '10to0.mp3' : '20to0.mp3';
      const filePath = path.join(__dirname, 'audio', file);

      if (!fs.existsSync(filePath)) {
        return interaction.reply({ content: `❌ File not found: ${file}`, ephemeral: true });
      }

      const resource = createAudioResource(filePath);
      player.play(resource);

      await interaction.reply({ content: `▶️ Playing: ${file}` });

      player.once(AudioPlayerStatus.Idle, async () => {
        console.log(`✅ Finished playing ${file}`);
    
        // Gửi lại message có các nút tương tác
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('count10')
                .setLabel('🔟Count 10 to 0')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('count20')
                .setLabel('2️⃣0️⃣Countdown 20 to 0')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('stop')
                .setLabel('⏹Stop')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('leave')
                .setLabel('👋Leave')
                .setStyle(ButtonStyle.Secondary)
        );
    
        try {
            await interaction.channel.send({
                content: '✅ Countdown finished! What do you want to do next?',
                components: [row],
            });
        } catch (err) {
            console.error('❌ Error sending follow-up buttons:', err);
        }
    });
    
    }

    if (interaction.customId === 'stop') {
      player.stop();
      await interaction.reply({ content: '⏹ Countdown stopped.' });
    }

    if (interaction.customId === 'leave') {
      const conn = getVoiceConnection(interaction.guild.id);
      if (conn) {
        conn.destroy();
        await interaction.reply({ content: '👋 Bot has left the voice channel.' });
      } else {
        await interaction.reply({ content: '❌ Bot is not connected.', ephemeral: true });
      }
    }
  }
});

client.login(token);
