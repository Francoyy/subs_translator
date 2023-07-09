import fs from 'fs';
import { parseSync, stringifySync } from 'subtitle';  
import translate from "translate";

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const whisperFixes = JSON.parse(fs.readFileSync('./whisper_fixes.json', 'utf8'));

translate.engine = config.ENGINE;
translate.key = config.KEY;
//zh-TW 

//Usage node index.js en "zh-tw" merge
var args = process.argv.slice(2);
const language_input = args[0];
const language_output = args[1];
const merge = args[2] && args[2] === "merge";

var process_input = function(subs) {
  for (let i=0;i<subs.length;i++) {
    subs[i].data.text = subs[i].data.text.replace("<u>","").replace("</u>", "");
    subs[i].data.text = subs[i].data.text.replace("<b>","").replace("</b>", "");
    for (let key in whisperFixes[language_input]) {
      if (subs[i].data.text.indexOf(key) > -1) {
        subs[i].data.text = subs[i].data.text.replace(key, whisperFixes[language_input][key]);
        //console.log("Replaced " + key + " with " + whisperFixes[language_input][key]);
      }
    };
  }

  let i=0;
  let current = "";
  let next = "";
  while (i < subs.length-1) {
    current = subs[i].data.text;
    next = subs[i+1].data.text;
    if (current === next) {
      subs[i].data.end = subs[i+1].data.end;
      subs[i].data.text = current;
      subs.splice(i+1, 1);
    } else {
      i++;
    }
  }
  return subs;
}

var process_output = function(translation) {
  //console.log("Checking translation=" + translation);
  for (let key in whisperFixes[language_output]) {
    if (translation.indexOf(key) > -1) {
      translation.replace(key, whisperFixes[language_output][key]);
      //console.log("Replaced " + key + " with " + whisperFixes[language_output][key]);
    }
  };
  return translation;
}

let subtitles = fs.readdirSync('./src')
let supportExtensions = ['srt', 'vtt']
for (let subtitleFile of subtitles) {
  if (!supportExtensions.includes(subtitleFile.split('.').pop())) continue
  let subtitleInput = fs.readFileSync(`./src/${subtitleFile}`, 'utf8');

  subtitleInput = parseSync(subtitleInput)
  subtitleInput = subtitleInput.filter(line => line.type === 'cue')
  subtitleInput = process_input(subtitleInput);

  let subtitleOutput = JSON.parse(JSON.stringify(subtitleInput));

  let current = "";
  for (let i=0;i<subtitleInput.length;i++) {
    current = subtitleInput[i].data.text;
    console.log(current);
    let translation = await translate(current, {from: language_input, to: language_output});
    console.log(translation);
    translation = process_output(translation);
    if (merge) {
      if (language_input === "en") { //always put the Chinese on top
        subtitleOutput[i].data.text = translation + "\n" + current;
      } else {
        subtitleOutput[i].data.text = current + "\n" + translation;
      }
    } else {
      subtitleOutput[i].data.text = translation;
    }
  }

  fs.writeFileSync(`./res/${language_output}_${subtitleFile}`, stringifySync(subtitleOutput, { format: 'srt' }));
  if (!merge) {
    fs.writeFileSync(`./res/${language_input}_${subtitleFile}`, stringifySync(subtitleInput, { format: 'srt' }));
  }
}
