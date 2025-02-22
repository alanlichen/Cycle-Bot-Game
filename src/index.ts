/*
Invite link: https://discord.com/api/oauth2/authorize?client_id=781939317450342470&permissions=272448&scope=bot
*/
import * as dotenv from "dotenv";
dotenv.config();

import * as Discord from "discord.js";

import * as g from "./global.js";

import admins from "./util/admin.js";

import { parse } from "./cmd-parser.js";
import { help, load, verifyHuman } from "./loader.js";

import "./idle.js";
import { initiate } from "./server.js";

const client = new Discord.Client({
  intents: ["GUILDS", "DIRECT_MESSAGES", "GUILD_EMOJIS_AND_STICKERS", "GUILD_MEMBERS", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS"]
});
let commands: { [i: string]: { cmds: g.Command[], desc: string } }, gcmdarr: g.Command[], ready = false;

// the limit is x before we have people confirm they are not self-botting.
// the array is: `commands used,bot input,bot answer`
const commandsUsed: { [i: string]: [number, string, number] } = {};


if (process.argv?.[2] == "-d") {
  console.log("[Info] Debugging mode active.");
  client.on("debug", x => console.log("[Log] ", x));
}

// remove start
import { MessageActionRow, MessageButton } from "discord.js";
// remove end
client.on("ready", async () => {
  client.user?.setPresence({ activities: [{ name: "&help for help!", type: "PLAYING" }], status: "idle" });
  console.log(`[Info] Logged in as ${client.user?.tag}!`);

  await (process.env.NODE_ENV ? g.Database.updateBackup() : g.Database.update());
  console.log("[Info] Loaded database.");

  commands = await load();
  gcmdarr = Object.keys(commands).reduce((prev: g.Command[], kurr): g.Command[] => prev.concat(commands[kurr].cmds), []);

  console.log(`[Info] Loaded ${gcmdarr.length} commands.`);
  ready = true;

  initiate(client);
  console.log("[Info] Initiated server.");
});

client.on("messageCreate", async (msg: Discord.Message) => {
  if (ready) {
    try {
      if (msg.author.bot || !msg.guild) return;

      // remove start
      if (msg.content == "&buttons") {
        const buttons = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId("yes")
              .setLabel("Yes")
              .setStyle("SUCCESS"),
            new MessageButton()
              .setCustomId("no")
              .setLabel("No")
              .setStyle("DANGER")
          );
        const mesg = await msg.channel.send({
          embeds: [{
            color: g.Colors.PRIMARY,
            title: "I like buttons",
            description: "Do you?"
          }],
          components: [
            buttons
          ]
        });

        const collector = mesg.createMessageComponentCollector({ filter: u => u.user.id == msg.author.id, time: 15000 });
        collector.on("collect", i => {
          const isyes = i.customId == "yes";
          i.update({
            embeds: [{
              color: isyes ? g.Colors.SUCCESS : g.Colors.ERROR,
              title: isyes ? "Good job!" : "Grrr",
              description: `You said ${isyes}. ${isyes ? "Good" : "Bad"} choice!`
            }],
            components: [buttons]
          });
        });

        /*
        collector.on("end", () => {
          mesg?.edit({
            components: []
          });
        });
        */
      }
      // remove end

      const cmd = parse("&", msg.content);
      if (!cmd) return;

      if (cmd.command == "help") help(msg, cmd.args, commands);
      else if (cmd.command == "verify") {
        if (commandsUsed[msg.author.id] && verifyHuman(msg, cmd.args, commandsUsed)) delete commandsUsed[msg.author.id];
      } else {
        for (const cmdclss of gcmdarr) {
          if (cmdclss.names.includes(cmd.command)) {
            if (commandsUsed[msg.author.id] && commandsUsed[msg.author.id][0] >= 100) {
              msg.channel.send({
                embeds: [{
                  color: g.Colors.WARNING,
                  title: "Anti-Bot Verification",
                  description: `Type the number for ${g.brackets(commandsUsed[msg.author.id][1])}\n
For example, if you get **one**, type in ${g.codestr("&verify 1")}`,
                  footer: {
                    text: "You cannot continue until you complete this challenge!"
                  }
                }]
              });
              break;
            }

            if (cmdclss.cooldown && cmdclss.getCooldown(msg.author) != null) {
              if (!cmdclss.sentCooldown(msg.author)) {
                cmdclss.wrapCooldown(msg, cmdclss.getCooldown(msg.author) ?? 0);
                cmdclss.setSent(msg.author);
              }
            } else if (cmdclss.isAdmin) {
              if (admins.includes(msg.author.id)) cmdclss.wrap(msg, cmd.args, client);
              else {
                g.Bot.errormsg(msg, "haha you don't have the perms!", "Permissions needed!");
              }
            } else cmdclss.wrap(msg, cmd.args, client);

            if (!commandsUsed[msg.author.id]) {
              const numbers = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
              const choice = g.randomChoice(numbers)[0];
              const answer = numbers.indexOf(choice);
              commandsUsed[msg.author.id] = [1, choice, answer];
            } else commandsUsed[msg.author.id][0]++;
            break;
          }
        }
      }
    } catch (err: any) {
      console.log("[Error]", err);
      const channel = client.channels.cache.get("899518500576579615") as Discord.TextChannel;

      if (channel) {
        channel.send({
          embeds: [{
            color: g.Colors.ERROR,
            title: "Error!",
            description: `Error is type ${g.brackets("UNHANDLED EXCEPTION")}`,
            fields: [{
              name: "Error",
              value: g.codestr(err.message, "js")
            }]
          }]
        });
      }
    }
  }
});


setInterval(async () => {
  if (process.env.NODE_ENV) {
    await g.Database.saveBackup();
    await g.Database.updateBackup();
  } else {
    await g.Database.save();
    await g.Database.update();
  }
}, 6e5); // 10 min


client.login(process.env.TOKEN);

process.on("unhandledRejection", reason => {
  console.log("[REJECTION ERROR]", reason);
});