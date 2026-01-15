
import {
  loadFileSystem,
  saveFileSystem,
  getNode,
  createNode,
  deleteNode,
  resolvePath,
  authenticateUser,
  switchUser,
  addUser,
  copyNode,
  moveNode,
  changePermissions
} from './terminalStorage';

// Terminal command history
interface CommandHistory {
  commands: string[];
  position: number;
}

export const commandHistory: CommandHistory = {
  commands: [],
  position: -1
};

// Add command to history
export const addToHistory = (command: string): void => {
  if (command.trim() && (commandHistory.commands.length === 0 || 
      commandHistory.commands[commandHistory.commands.length - 1] !== command)) {
    commandHistory.commands.push(command);
  }
  commandHistory.position = commandHistory.commands.length;
};

// Get previous command from history
export const getPreviousCommand = (): string => {
  if (commandHistory.commands.length === 0) return '';
  
  if (commandHistory.position > 0) {
    commandHistory.position--;
  }
  
  return commandHistory.commands[commandHistory.position] || '';
};

// Get next command from history
export const getNextCommand = (): string => {
  if (commandHistory.position < commandHistory.commands.length - 1) {
    commandHistory.position++;
    return commandHistory.commands[commandHistory.position];
  }
  
  commandHistory.position = commandHistory.commands.length;
  return '';
};

// Terminal state
interface TerminalState {
  currentPath: string;
  output: string[];
  currentInput: string;
  inputPosition: number;
  isPasswordMode: boolean;
  tempUser: string;
  sudoMode: boolean;
  sudoCommand: string;
}

export const initialTerminalState: TerminalState = {
  currentPath: '/home/ubuntu',
  output: ['Welcome to Ubuntu 22.04.1 LTS (GNU/Linux 5.15.0-56-generic x86_64)', 'Type "help" to see available commands.'],
  currentInput: '',
  inputPosition: 0,
  isPasswordMode: false,
  tempUser: '',
  sudoMode: false,
  sudoCommand: ''
};

export interface CommandResult {
  output: string[];
  newPath?: string;
  isPasswordMode?: boolean;
  tempUser?: string;
  sudoMode?: boolean;
  sudoCommand?: string;
}

// List of available commands for autocompletion
const AVAILABLE_COMMANDS = [
  'ls', 'cd', 'pwd', 'mkdir', 'touch', 'cat', 'rm', 'echo', 'clear',
  'sudo', 'su', 'whoami', 'adduser', 'passwd', 'apt', 'apt-get',
  'grep', 'date', 'uname', 'df', 'ps', 'top', 'man', 'cp', 'mv',
  'chmod', 'find', 'help', 'exit'
];

// Command autocompletion
export const getAutocompleteOptions = (input: string, currentPath: string): string[] => {
  if (!input.trim()) return [];
  
  const fs = loadFileSystem();
  const args = input.trim().split(/\s+/);
  
  // If we're on the first word, autocomplete commands
  if (args.length === 1) {
    return AVAILABLE_COMMANDS.filter(cmd => cmd.startsWith(args[0]));
  }
  
  // For 'cd', 'ls', 'cat', etc. autocomplete paths
  const pathCommands = ['cd', 'ls', 'cat', 'rm', 'mkdir', 'touch', 'cp', 'mv'];
  if (pathCommands.includes(args[0]) && args.length === 2) {
    const currentNode = getNode(fs, currentPath);
    if (!currentNode || !currentNode.children) return [];
    
    const prefix = args[1];
    const options: string[] = [];
    
    Object.entries(currentNode.children).forEach(([name, node]) => {
      if (name.startsWith(prefix)) {
        if (node.type === 'directory') {
          options.push(`${args[0]} ${name}/`);
        } else {
          options.push(`${args[0]} ${name}`);
        }
      }
    });
    
    return options;
  }
  
  return [];
};

// Process a command and return the result
export const processCommand = (
  command: string,
  state: TerminalState,
  password?: string
): CommandResult => {
  // Handle sudo password entry
  if (state.sudoMode && password) {
    const fs = loadFileSystem();
    if (authenticateUser(fs, 'root', password)) {
      const originalUser = fs.currentUser;
      fs.currentUser = 'root';
      saveFileSystem(fs);
      
      const result = processCommandInternal(state.sudoCommand, state);
      
      fs.currentUser = originalUser;
      saveFileSystem(fs);
      
      return {
        ...result,
        sudoMode: false,
        sudoCommand: ''
      };
    } else {
      return {
        output: ['Sorry, try again.'],
        sudoMode: false,
        sudoCommand: ''
      };
    }
  }

  // Handle login password entry
  if (state.isPasswordMode && password) {
    const fs = loadFileSystem();
    if (authenticateUser(fs, state.tempUser, password)) {
      switchUser(fs, state.tempUser);
      const homeDir = fs.users[state.tempUser]?.homeDir || `/home/${state.tempUser}`;
      
      return {
        output: [`Welcome, ${state.tempUser}!`],
        newPath: homeDir,
        isPasswordMode: false,
        tempUser: ''
      };
    } else {
      return {
        output: ['Authentication failed.'],
        isPasswordMode: false,
        tempUser: ''
      };
    }
  }

  return processCommandInternal(command, state);
};

// Internal command processor
const processCommandInternal = (
  command: string,
  state: TerminalState
): CommandResult => {
  const fs = loadFileSystem();
  const args = command.trim().split(/\s+/);
  const cmd = args[0].toLowerCase();
  
  if (command.trim() === '') {
    return { output: [] };
  }

  // Handle sudo
  if (cmd === 'sudo') {
    // Skip sudo and run as root
    if (args.length > 1) {
      return {
        output: ['[sudo] password for ' + fs.currentUser + ':'],
        sudoMode: true,
        sudoCommand: args.slice(1).join(' ')
      };
    } else {
      return { output: ['sudo: command required'] };
    }
  }

  // Common commands
  switch (cmd) {
    case 'pwd':
      return { output: [state.currentPath] };
      
    case 'cd':
      const targetPath = args[1] || '~';
      const resolvedPath = resolvePath(fs, targetPath, state.currentPath);
      const targetNode = getNode(fs, resolvedPath);
      
      if (!targetNode) {
        return { output: [`cd: ${args[1]}: No such file or directory`] };
      }
      
      if (targetNode.type !== 'directory') {
        return { output: [`cd: ${args[1]}: Not a directory`] };
      }
      
      return { 
        output: [],
        newPath: resolvedPath
      };
      
    case 'ls':
      let lsPath = state.currentPath;
      let showHidden = false;
      let longFormat = false;
      
      // Parse ls options
      for (let i = 1; i < args.length; i++) {
        if (args[i].startsWith('-')) {
          if (args[i].includes('a')) showHidden = true;
          if (args[i].includes('l')) longFormat = true;
        } else {
          lsPath = resolvePath(fs, args[i], state.currentPath);
        }
      }
      
      const lsNode = getNode(fs, lsPath);
      if (!lsNode) {
        return { output: [`ls: cannot access '${args[1]}': No such file or directory`] };
      }
      
      if (lsNode.type === 'file') {
        return { output: [args[1]] };
      }
      
      if (!lsNode.children) {
        return { output: [] };
      }
      
      const entries = Object.entries(lsNode.children)
        .filter(([name]) => showHidden || !name.startsWith('.'));
      
      if (longFormat) {
        const output = entries.map(([name, node]) => {
          const typeChar = node.type === 'directory' ? 'd' : '-';
          const sizeStr = node.type === 'file' ? 
            (node.content?.length || 0).toString() : 
            '4096';
          const date = new Date(node.modified);
          const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
          return `${typeChar}${node.permissions} ${node.owner} ${sizeStr} ${dateStr} ${name}${node.type === 'directory' ? '/' : ''}`;
        });
        
        return { output };
      } else {
        const output = entries.map(([name, node]) => 
          node.type === 'directory' ? name + '/' : name
        );
        
        if (output.length === 0) {
          return { output: [''] };
        }
        
        return { output: [output.join('  ')] };
      }
      
    case 'mkdir':
      if (args.length < 2) {
        return { output: ['mkdir: missing operand'] };
      }
      
      const dirPath = resolvePath(fs, args[1], state.currentPath);
      if (createNode(fs, dirPath, 'directory')) {
        return { output: [] };
      } else {
        return { output: [`mkdir: cannot create directory '${args[1]}': File exists or invalid path`] };
      }
      
    case 'touch':
      if (args.length < 2) {
        return { output: ['touch: missing file operand'] };
      }
      
      const filePath = resolvePath(fs, args[1], state.currentPath);
      if (createNode(fs, filePath, 'file')) {
        return { output: [] };
      } else {
        return { output: [`touch: cannot touch '${args[1]}': File exists or invalid path`] };
      }
      
    case 'cat':
      if (args.length < 2) {
        return { output: ['cat: missing file operand'] };
      }
      
      const catPath = resolvePath(fs, args[1], state.currentPath);
      const fileNode = getNode(fs, catPath);
      
      if (!fileNode) {
        return { output: [`cat: ${args[1]}: No such file or directory`] };
      }
      
      if (fileNode.type !== 'directory') {
        const fileContent = (fileNode.content || '').split('\n');
        return { output: fileContent };
      } else {
        return { output: [`cat: ${args[1]}: Is a directory`] };
      }
      
    case 'echo':
      // Handle redirection
      const echoText = args.slice(1).join(' ');
      const redirectIndex = echoText.indexOf('>');
      
      if (redirectIndex >= 0) {
        const content = echoText.substring(0, redirectIndex).trim();
        let redirectPath = echoText.substring(redirectIndex + 1).trim();
        
        if (redirectPath.startsWith('>')) {
          // Append mode
          redirectPath = redirectPath.substring(1).trim();
          const appendPath = resolvePath(fs, redirectPath, state.currentPath);
          const appendNode = getNode(fs, appendPath);
          
          if (appendNode && appendNode.type === 'file') {
            appendNode.content = (appendNode.content || '') + '\n' + content;
            appendNode.modified = Date.now();
            saveFileSystem(fs);
            return { output: [] };
          } else if (!appendNode) {
            // Create new file
            if (createNode(fs, appendPath, 'file', content)) {
              return { output: [] };
            }
          } else {
            return { output: [`echo: ${redirectPath}: Is a directory`] };
          }
        } else {
          // Write mode
          const writePath = resolvePath(fs, redirectPath, state.currentPath);
          const lastSlashIndex = writePath.lastIndexOf('/');
          const parentPath = lastSlashIndex <= 0 ? '/' : writePath.substring(0, lastSlashIndex);
          const name = writePath.substring(lastSlashIndex + 1);
          
          const parentNode = getNode(fs, parentPath);
          if (!parentNode || parentNode.type !== 'directory') {
            return { output: [`echo: ${redirectPath}: No such file or directory`] };
          }
          
          if (!parentNode.children) {
            parentNode.children = {};
          }
          
          if (parentNode.children[name] && parentNode.children[name].type === 'file') {
            parentNode.children[name].content = content;
            parentNode.children[name].modified = Date.now();
          } else if (!parentNode.children[name]) {
            createNode(fs, writePath, 'file', content);
          } else {
            return { output: [`echo: ${redirectPath}: Is a directory`] };
          }
          
          saveFileSystem(fs);
          return { output: [] };
        }
      } else {
        return { output: [echoText] };
      }
      
    case 'rm':
      let recursive = false;
      let force = false;
      let rmPath = '';
      
      // Parse rm options
      for (let i = 1; i < args.length; i++) {
        if (args[i].startsWith('-')) {
          if (args[i].includes('r') || args[i].includes('R')) recursive = true;
          if (args[i].includes('f')) force = true;
        } else {
          rmPath = args[i];
        }
      }
      
      if (!rmPath) {
        return { output: ['rm: missing operand'] };
      }
      
      const rmNodePath = resolvePath(fs, rmPath, state.currentPath);
      const rmNode = getNode(fs, rmNodePath);
      
      if (!rmNode) {
        if (force) {
          return { output: [] };
        }
        return { output: [`rm: cannot remove '${rmPath}': No such file or directory`] };
      }
      
      if (rmNode.type === 'directory' && !recursive) {
        return { output: [`rm: cannot remove '${rmPath}': Is a directory`] };
      }
      
      if (deleteNode(fs, rmNodePath)) {
        return { output: [] };
      } else {
        return { output: [`rm: cannot remove '${rmPath}'`] };
      }
      
    case 'clear':
      return { output: ['CLEAR_TERMINAL'] };
      
    case 'whoami':
      return { output: [fs.currentUser] };
      
    case 'su':
      const targetUser = args[1] || 'root';
      
      if (!fs.users[targetUser]) {
        return { output: [`su: user ${targetUser} does not exist`] };
      }
      
      if (fs.currentUser === 'root' || targetUser === fs.currentUser) {
        // Root can switch without password
        switchUser(fs, targetUser);
        return { 
          output: [],
          newPath: fs.users[targetUser].homeDir
        };
      }
      
      return {
        output: [`Password for ${targetUser}:`],
        isPasswordMode: true,
        tempUser: targetUser
      };
      
    case 'adduser':
      if (fs.currentUser !== 'root') {
        return { output: ['adduser: Only root may add a user or group to the system.'] };
      }
      
      if (args.length < 2) {
        return { output: ['adduser: Missing username'] };
      }
      
      const newUsername = args[1];
      const newPassword = args[2] || newUsername; // Default password is same as username
      
      if (addUser(fs, newUsername, newPassword)) {
        return { output: [`Added user ${newUsername}. Home directory created at /home/${newUsername}`] };
      } else {
        return { output: [`adduser: The user '${newUsername}' already exists.`] };
      }
      
    case 'passwd':
      if (args.length < 2) {
        return { output: ['passwd: Missing username'] };
      }
      
      if (fs.currentUser !== 'root' && fs.currentUser !== args[1]) {
        return { output: ['passwd: Only root can change passwords for other users'] };
      }
      
      if (!fs.users[args[1]]) {
        return { output: [`passwd: user '${args[1]}' does not exist`] };
      }
      
      if (args.length < 3) {
        return { output: ['passwd: Missing new password'] };
      }
      
      fs.users[args[1]].password = args[2];
      saveFileSystem(fs);
      
      return { output: [`Password for ${args[1]} changed`] };
      
    case 'apt':
    case 'apt-get':
      const aptCommand = args[1] || '';
      
      switch (aptCommand) {
        case 'update':
          return { output: ['Reading package lists... Done', 'Building dependency tree... Done', 'All packages are up to date.'] };
          
        case 'upgrade':
          return { output: ['Reading package lists... Done', 'Building dependency tree... Done', 'Calculating upgrade... Done', '0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.'] };
          
        case 'install':
          if (args.length < 3) {
            return { output: ['apt: Missing package name'] };
          }
          
          return { output: [`Simulating installation of ${args.slice(2).join(', ')}...`, 'Done!'] };
          
        default:
          return { 
            output: [
              'apt-get commands:',
              '  update - Retrieve new lists of packages',
              '  upgrade - Perform an upgrade',
              '  install - Install packages'
            ] 
          };
      }
      
    case 'grep':
      if (args.length < 3) {
        return { output: ['grep: missing pattern or file'] };
      }
      
      const pattern = args[1];
      const grepPath = resolvePath(fs, args[2], state.currentPath);
      const grepNode = getNode(fs, grepPath);
      
      if (!grepNode) {
        return { output: [`grep: ${args[2]}: No such file or directory`] };
      }
      
      if (grepNode.type !== 'file') {
        return { output: [`grep: ${args[2]}: Is a directory`] };
      }
      
      const matchingLines = (grepNode.content || '')
        .split('\n')
        .filter(line => line.includes(pattern));
        
      return { output: matchingLines.length > 0 ? matchingLines : [''] };
      
    case 'date':
      return { output: [new Date().toString()] };
      
    case 'uname':
      if (args.includes('-a')) {
        return { 
          output: [
            'Linux terminal-simulation 5.15.0-56-generic #1 SMP Ubuntu 22.04.1 LTS x86_64 GNU/Linux'
          ] 
        };
      }
      return { output: ['Linux'] };
      
    case 'df':
      return { 
        output: [
          'Filesystem     1K-blocks    Used Available Use% Mounted on',
          'udev             8151440       0   8151440   0% /dev',
          'tmpfs            1638624    1852   1636772   1% /run',
          '/dev/sda1      165735648 5121324 151918800   4% /'
        ] 
      };
    
    case 'ps':
      return {
        output: [
          'PID TTY          TIME CMD',
          '  1 pts/0    00:00:00 bash',
          `  ${Math.floor(Math.random() * 9000) + 1000} pts/0    00:00:00 ps`
        ]
      };
      
    case 'top':
      return {
        output: [
          'top - ' + new Date().toLocaleTimeString() + ' up 2 days,  3:12,  1 user,  load average: 0.00, 0.01, 0.05',
          'Tasks:   3 total,   1 running,   2 sleeping,   0 stopped,   0 zombie',
          '%Cpu(s):  2.0 us,  1.0 sy,  0.0 ni, 97.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st',
          'MiB Mem :  16000.0 total,  14000.0 free,   1200.0 used,    800.0 buff/cache',
          'MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.  14000.0 avail Mem',
          '',
          '  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND',
          '    1 root      20   0   10000   2400   1600 S   0.0   0.0   0:00.10 init',
          `${Math.floor(Math.random() * 9000) + 1000} ${fs.currentUser}      20   0   12000   3000   2000 R   0.7   0.0   0:00.01 top`,
          '(press q to quit)'
        ]
      };
    
    case 'cp':
      if (args.length < 3) {
        return { output: ['cp: missing file operand'] };
      }
      
      const sourcePath = resolvePath(fs, args[1], state.currentPath);
      const destinationPath = resolvePath(fs, args[2], state.currentPath);
      
      const sourceNode = getNode(fs, sourcePath);
      if (!sourceNode) {
        return { output: [`cp: cannot stat '${args[1]}': No such file or directory`] };
      }
      
      if (copyNode(fs, sourcePath, destinationPath)) {
        return { output: [] };
      } else {
        return { output: [`cp: cannot copy '${args[1]}' to '${args[2]}'`] };
      }
    
    case 'mv':
      if (args.length < 3) {
        return { output: ['mv: missing file operand'] };
      }
      
      const mvSourcePath = resolvePath(fs, args[1], state.currentPath);
      const mvDestinationPath = resolvePath(fs, args[2], state.currentPath);
      
      const mvSourceNode = getNode(fs, mvSourcePath);
      if (!mvSourceNode) {
        return { output: [`mv: cannot stat '${args[1]}': No such file or directory`] };
      }
      
      if (moveNode(fs, mvSourcePath, mvDestinationPath)) {
        return { output: [] };
      } else {
        return { output: [`mv: cannot move '${args[1]}' to '${args[2]}'`] };
      }
    
    case 'chmod':
      if (args.length < 3) {
        return { output: ['chmod: missing operand'] };
      }
      
      const mode = args[1];
      const chmodPath = resolvePath(fs, args[2], state.currentPath);
      
      const chmodNode = getNode(fs, chmodPath);
      if (!chmodNode) {
        return { output: [`chmod: cannot access '${args[2]}': No such file or directory`] };
      }
      
      // Simple implementation - just accept the mode
      if (changePermissions(fs, chmodPath, mode)) {
        return { output: [] };
      } else {
        return { output: [`chmod: invalid mode: '${mode}'`] };
      }
    
    case 'man':
      if (args.length < 2) {
        return { output: ['What manual page do you want?'] };
      }
      
      const manCommand = args[1].toLowerCase();
      
      // Basic manual pages for a few commands
      const manPages: Record<string, string[]> = {
        ls: [
          'NAME',
          '       ls - list directory contents',
          '',
          'SYNOPSIS',
          '       ls [OPTION]... [FILE]...',
          '',
          'DESCRIPTION',
          '       List information about the FILEs (the current directory by default).',
          '       Sort entries alphabetically.',
          '',
          '       -a, --all',
          '              do not ignore entries starting with .',
          '',
          '       -l     use a long listing format'
        ],
        cd: [
          'NAME',
          '       cd - change the working directory',
          '',
          'SYNOPSIS',
          '       cd [dir]',
          '',
          'DESCRIPTION',
          '       Change the shell working directory.',
          '',
          '       Change the current directory to DIR. The default DIR is the value of the',
          '       HOME shell variable.'
        ]
      };
      
      if (manPages[manCommand]) {
        return { output: manPages[manCommand] };
      } else {
        return { output: [`No manual entry for ${manCommand}`] };
      }
      
    case 'help':
      return { 
        output: [
          'Available commands:',
          'File operations: ls, cd, mkdir, touch, cat, rm, cp, mv, pwd, chmod',
          'System commands: clear, whoami, su, sudo, adduser, passwd',
          'Package management: apt-get, apt',
          'Text processing: echo, grep',
          'Information: date, uname, df, ps, top, man, help',
          '',
          'Use man <command> for more information on specific commands.'
        ] 
      };
      
    case 'exit':
      return { output: ['Exiting terminal session...'] };
      
    default:
      if (['--help', '-h'].includes(args[1])) {
        return { output: [`Help for ${cmd} would be displayed here.`] };
      }
      return { output: [`${cmd}: command not found`] };
  }
};
