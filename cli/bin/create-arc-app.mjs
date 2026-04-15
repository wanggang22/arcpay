#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';
import kleur from 'kleur';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '..', 'templates');

const TEMPLATES = [
  { title: 'Creator Tip Page', value: 'creator-tip', hint: 'Simple "buy me a coffee" style tip page' },
  { title: 'Subscription Platform', value: 'creator-subscribe', hint: 'Monthly USDC subscriptions (like Substack)' },
  { title: 'Content Paywall', value: 'content-paywall', hint: 'Gated article/video access' },
  { title: 'Paid API (x402)', value: 'paywall-api', hint: 'Charge per API call in USDC' },
  { title: 'Agent Payment Gateway', value: 'agent-pay', hint: 'AI agent pays for services in USDC' },
];

async function main() {
  console.log(kleur.bold().cyan('\n⚡ create-arc-app\n'));
  console.log(kleur.dim('  Scaffold an ArcPay app on Arc Network in seconds\n'));

  const nameArg = process.argv[2];

  const answers = await prompts([
    {
      type: nameArg ? null : 'text',
      name: 'projectName',
      message: 'Project name',
      initial: 'my-arcpay-app',
      validate: (v) => /^[a-z0-9-_]+$/.test(v) ? true : 'Use lowercase, digits, dash, underscore',
    },
    {
      type: 'select',
      name: 'template',
      message: 'Pick a template',
      choices: TEMPLATES,
    },
    {
      type: 'select',
      name: 'network',
      message: 'Deploy to',
      choices: [
        { title: 'Arc Testnet (public, chain 5042002)', value: 'testnet' },
        { title: 'Arc Local (your own node, chain 1337)', value: 'local' },
      ],
    },
  ]);

  const projectName = nameArg || answers.projectName;
  if (!projectName || !answers.template) {
    console.log(kleur.red('\n✖ Cancelled.\n'));
    process.exit(1);
  }

  const destDir = path.resolve(process.cwd(), projectName);
  if (fs.existsSync(destDir)) {
    console.log(kleur.red(`\n✖ ${destDir} already exists.\n`));
    process.exit(1);
  }

  const srcDir = path.join(TEMPLATES_DIR, answers.template);
  if (!fs.existsSync(srcDir)) {
    console.log(kleur.red(`\n✖ Template ${answers.template} not found at ${srcDir}\n`));
    process.exit(1);
  }

  fs.mkdirSync(destDir, { recursive: true });
  copyDir(srcDir, destDir, { projectName, network: answers.network });

  console.log(kleur.green('\n✓ Scaffolded!\n'));
  console.log(kleur.bold('Next steps:'));
  console.log(kleur.dim(`  cd ${projectName}`));
  console.log(kleur.dim('  npm install'));
  console.log(kleur.dim('  # Edit .env with your private key'));
  console.log(kleur.dim('  npm run dev\n'));
  console.log(kleur.dim(`Docs: https://docs.arcpay.io/templates/${answers.template}\n`));
}

function copyDir(src, dest, vars) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    let destName = entry.name;
    // Rename `_gitignore` → `.gitignore` (npm strips dotfiles on publish)
    if (destName === '_gitignore') destName = '.gitignore';
    if (destName === '_env.example') destName = '.env.example';
    const destPath = path.join(dest, destName);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath, vars);
    } else {
      let content = fs.readFileSync(srcPath, 'utf8');
      // Template variables: {{projectName}}, {{network}}
      content = content.replace(/\{\{projectName\}\}/g, vars.projectName);
      content = content.replace(/\{\{network\}\}/g, vars.network);
      fs.writeFileSync(destPath, content);
    }
  }
}

main().catch((e) => {
  console.error(kleur.red(e.message));
  process.exit(1);
});
