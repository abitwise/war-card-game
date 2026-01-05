#!/usr/bin/env node
import { Command } from 'commander';
import { createPlayCommand } from './cli/commands/play.js';
import { createSimulateCommand } from './cli/commands/simulate.js';
import { createTraceCommand } from './cli/commands/trace.js';

const program = new Command();

program
  .name('war')
  .description('War card game CLI (interactive play and simulations).')
  .version('0.1.0');

program.addCommand(createPlayCommand());
program.addCommand(createSimulateCommand());
program.addCommand(createTraceCommand());

program.parse(process.argv);
