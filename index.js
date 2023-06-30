import fs from 'fs';
import { parseSync, stringifySync } from 'subtitle';  
import translate from "translate";

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'))

translate.engine = config.ENGINE;
translate.key = config.KEY;
//zh-TW 

//Usage node index.js en "zh-tw" merge
var args = process.argv.slice(2);
const language_input = args[0];
const language_output = args[1];
const merge = args[2] && args[2] === "merge";

let subtitles = fs.readdirSync('./src')
let supportExtensions = ['srt', 'vtt']
for (let subtitleFile of subtitles) {
  if (!supportExtensions.includes(subtitleFile.split('.').pop())) continue
  let subtitle = fs.readFileSync(`./src/${subtitleFile}`, 'utf8')
  subtitle = parseSync(subtitle)
  subtitle = subtitle.filter(line => line.type === 'cue')

  let current = "";
  for (let i=0;i<subtitle.length;i++) {
    current = subtitle[i].data.text;
    console.log(current);
    let translation = await translate(current, {from: language_input, to: language_output});
    console.log(translation);
    if (merge) {
      subtitle[i].data.text = current + "\n" + translation;
    } else {
      subtitle[i].data.text = translation;
    }
  }

  fs.writeFileSync(`./res/${subtitleFile}`, stringifySync(subtitle, { format: 'srt' }))
}
