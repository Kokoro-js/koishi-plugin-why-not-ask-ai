import { Context, Dict, Logger, Schema, trimSlash } from "koishi";

export const name = "why-not-ask-gpt";

export interface Config {
  apikey: string;
  proxy: string;
  area: string;
  symbol: string;
  commands: Dict<string>;
}

export const Config: Schema<Config> = Schema.object({
  apikey: Schema.string()
    .required()
    .description("OpenAI API Key (GPT-3.5-Turbo)"),
  proxy: Schema.string().default("https://api.openai.com"),
  area: Schema.string()
    .role("textarea", { rows: [2, 4] })
    .default(
      '你需要为我选择一个指令并仅回复整个指令，指令有 <> [] 标注的选项你应自主理解描述并填入选项，如果找不到相应指令的回复 "未找到"',
    ),
  symbol: Schema.string()
    .default("未找到")
    .description("找不到指令时约定提示词。"),
  commands: Schema.dict(String).role("table"),
});

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define("zh-CN", require("./zh"));

  let cmds = "";
  for (const [key, value] of Object.entries(config.commands)) {
    cmds += `${key} - ${value}\n`;
  }

  ctx.command("ask <info:text>").action(async ({ session }, info) => {
    const response = await ctx.http.axios({
      method: "post",
      url: trimSlash(`${config.proxy}/v1/chat/completions`),
      headers: {
        Authorization: `Bearer ${config.apikey}`,
        "Content-Type": "application/json",
      },
      data: {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: config.area + "\n" + cmds }, // 换新行来保证指令识别
          { role: "user", content: info },
        ],
      },
      timeout: 600000,
    });
    const cmd: string = response.data["choices"][0]["message"]["content"];
    if (cmd == config.symbol) {
      return cmd;
    }
    session.execute(response.data["choices"][0]["message"]["content"]);
  });
}
