import * as Discord from "discord.js";
import { Command, Colors, brackets, plural, formatDate } from "../../global.js";

class C extends Command {
  names = ["uptime", "about", "bot-about", "bot-servers", "bot-info"];
  help = "View some general statistics about the bot.";
  isGame = "n" as const;

  exec(msg: Discord.Message, _: string[], client: Discord.Client) {
    const guildCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce((p, c) => p + c.memberCount, 0);

    msg.channel.send({
      embeds: [{
        color: Colors.PRIMARY,
        title: "Bot Statistics",
        description: "View bot statistics!",
        fields: [{
          name: "Uptime",
          value: formatDate(client.uptime ?? 0)
        }, {
          name: "Servers",
          value: `In ${brackets(guildCount.toString())} server${plural(guildCount)}!`
        }, {
          name: "Users",
          value: `The bot is overseeing ${brackets(userCount.toString())} user${plural(userCount)}.`
        }, {
          name: "Creator",
          value: "[Junhao Zhang](https://github.com/cursorweb) ([@Coder100](https://repl.it/@Coder100)) with TypeScript."
        }]
      }]
    });
  }
}

export const c = new C();