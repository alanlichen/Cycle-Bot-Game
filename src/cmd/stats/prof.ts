import * as Discord from "discord.js";
import { Command, Colors, Bot, Database, parseMention, brackets, commanum, cleanName } from "../../global";
import { CycleUser } from "../../util/database/database";

class C extends Command {
  names = ["profile", "prof"];
  help = "View yours or someone elses' profile.";
  examples = ["prof", "prof Coder100"];
  isGame = "p" as const;

  exec(msg: Discord.Message, args: string[], _: Discord.Client) {
    if (args.length > 1) return Bot.argserror(msg, args.length, [0, 1]);

    let user: CycleUser;

    if (args.length == 0) {
      user = Database.getUser(msg.author.id);
    } else {
      const userArg = parseMention(args[0]);

      if (userArg.type == "id") {
        user = Database.getUser(userArg.value);
        if (!user) return Bot.usererr(msg, `User ${brackets(`<@${ userArg.value }>`)} not found.`, "User not found!");
      } else {
        const userArr = Database.findUser(u => u.name.toLowerCase().indexOf(userArg.value.toLowerCase()) > -1);
        if (userArr.length == 0) return Bot.usererr(msg, `User ${brackets(userArg.value)} not found. Check your spelling!`, "User not found!");
        else if (userArr.length > 1) {
          return Bot.errormsg(msg, `Found ${brackets(userArr.length.toString())} users.
${userArr.slice(0, 10).map(o => `${brackets(Database.getUser(o).name)}: **${o}**`).join("\n")}`, "Multiple users found!");
        }
        user = Database.getUser(userArr[0]);
      }
    }

    msg.channel.send({
      embed: {
        color: Colors.SUCCESS,
        title: `User ${brackets(cleanName(user.name))}`,

        description: `View the profile of ${brackets(cleanName(user.name))}
**Cycles**: ${commanum(user.cycles)}
**Text**: ${commanum(user.text)}
**Level**: ${commanum(user.level)}`,
        fields: [{
          name: "TPC (Text Per Code)",
          value: commanum(user.tpc)
        }, {
          name: "CPP (Cycles Per Post)",
          value: commanum(user.cpp)
        }, {
          name: "TPM (Text Per Minute)",
          value: commanum(user.tpm)
        }],

        footer: {
          text: "Use &bal to view stats about yourself!"
        }
      }
    });
  }
}

export const c = new C();