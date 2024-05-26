import { Context, Dict, Logger, Model, Schema, trimSlash } from "koishi";

export const name = "why-not-ask-gpt";

export interface Config {
  apikey: string;
  proxy: string;
  prompt: string;
  model: string;
  symbol: string;
  commands: Dict<string>;
  at: boolean;
}

export const usage = `
<h2>如遇使用问题可以前往QQ群: <a href="http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=co1LDHaK22kjUCwaHIj-USETpxh3Fx_I&authKey=2UVKksVxVuzY32rD9Fqbl6g%2F7vyc%2Flg%2Feu80UTRfDSpve6tfWO%2FZ7p8tztF1JD6w&noverify=0&group_code=957500313"> 957500313 </a>讨论<h2>

<h2>目前只支持 OpenAI API 格式的大模型接口，如 <a href="https://deepseek.com">DeepSeek</a> 或者其他 OpenAI 接口<h2>
`

export const Config: Schema<Config> = Schema.object({
  apikey: Schema.string()
    .required()
    .description("你的 API key"),
  proxy: Schema.string().default("https://api.deepseek.com/chat/completions").description("你的 API 代理地址"),
  model: Schema.string().default("deepseek-chat").description("你的 API 模型"),
  prompt: Schema.string()
    .role("textarea", { rows: [2, 4] })
    .default(
      '你需要为我选择一个指令并仅回复整个指令，指令有 <> [] 标注的选项你应自主理解描述并填入选项，如果找不到相应指令的回复 "未找到"',
    ),
  symbol: Schema.string()
    .default("未找到")
    .description("找不到指令时约定提示词。"),
  commands: Schema.dict(String).role("table"),
  at: Schema.boolean().default(false).description("是否在bot被 @ 时响应")
});

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define("zh-CN", require("./zh"));
  let cmds = "";
  for (const [key, value] of Object.entries(config.commands)) {
    cmds += `${key} - ${value}\n`;
  }
  async function getResponse(info: string) {
    const response = await ctx.http.post(
      config.proxy,
      {
        model: config.model,
        messages: [
          { role: "system", content: config.prompt + "\n" + cmds }, // 换新行来保证指令识别
          { role: "user", content: info },
        ],
        stream: false
      },
      {
        headers: {
          Authorization: `Bearer ${config.apikey}`,
          "Content-Type": "application/json",
        },
        timeout: 600000
      }
    )
    return response.choices[0].message.content
  }

  if (config.at) {
    ctx.middleware(async (session, next) => {
      if (session.stripped.atSelf) {
        let content = session.content.replace(/<at.*?\/>/g, "").trim();
        let cmd: string = await getResponse(content);
        if (cmd == config.symbol) {
          return cmd;
        }
        session.execute(cmd);
      }
    })
  };

  ctx.command("ask <info:text>").action(async ({ session }, info) => {
    if (!info) return `缺少参数`;
    let cmd: string = await getResponse(info);
    if (cmd == config.symbol) {
      return cmd;
    }
    session.execute(cmd);
  });
}
