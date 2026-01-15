// Persistent file system using localStorage

interface FileSystemNode {
  type: 'file' | 'directory';
  content?: string;
  children?: Record<string, FileSystemNode>;
  owner: string;
  permissions: string; // e.g. "rwxr-xr--"
  created: number;
  modified: number;
}

interface FileSystem {
  root: FileSystemNode;
  currentUser: string;
  users: Record<string, { 
    password: string;
    isAdmin: boolean;
    homeDir: string;
  }>;
}

// Initialize default file system
const defaultFileSystem: FileSystem = {
  root: {
    type: 'directory',
    children: {
      home: {
        type: 'directory',
        children: {
          ubuntu: {
            type: 'directory',
            children: {
              'welcome.txt': {
                type: 'file',
                content: 'Welcome to Ubuntu Terminal!\nType "help" to see available commands.',
                owner: 'ubuntu',
                permissions: 'rw-r--r--',
                created: Date.now(),
                modified: Date.now(),
              },
              '.bashrc': {
                type: 'file',
                content: '# ~/.bashrc: executed by bash for non-login shells\n# If not running interactively, don\'t do anything\n[[ "$-" != *i* ]] && return\n# Don\'t put duplicate lines in the history\nHISTCONTROL=ignoreboth',
                owner: 'ubuntu',
                permissions: 'rw-r--r--',
                created: Date.now(),
                modified: Date.now(),
              }
            },
            owner: 'ubuntu',
            permissions: 'rwxr-xr-x',
            created: Date.now(),
            modified: Date.now(),
          }
        },
        owner: 'root',
        permissions: 'rwxr-xr-x',
        created: Date.now(),
        modified: Date.now(),
      },
      etc: {
        type: 'directory',
        children: {
          'passwd': {
            type: 'file',
            content: 'root:x:0:0:root:/root:/bin/bash\nubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash',
            owner: 'root',
            permissions: 'rw-r--r--',
            created: Date.now(),
            modified: Date.now(),
          },
          'hostname': {
            type: 'file',
            content: 'ubuntu-terminal',
            owner: 'root',
            permissions: 'rw-r--r--',
            created: Date.now(),
            modified: Date.now(),
          },
          'hosts': {
            type: 'file',
            content: '127.0.0.1 localhost\n127.0.1.1 ubuntu-terminal',
            owner: 'root',
            permissions: 'rw-r--r--',
            created: Date.now(),
            modified: Date.now(),
          }
        },
        owner: 'root',
        permissions: 'rwxr-xr-x',
        created: Date.now(),
        modified: Date.now(),
      },
      bin: {
        type: 'directory',
        children: {},
        owner: 'root',
        permissions: 'rwxr-xr-x',
        created: Date.now(),
        modified: Date.now(),
      },
      usr: {
        type: 'directory',
        children: {
          bin: {
            type: 'directory',
            children: {},
            owner: 'root',
            permissions: 'rwxr-xr-x',
            created: Date.now(),
            modified: Date.now(),
          }
        },
        owner: 'root',
        permissions: 'rwxr-xr-x',
        created: Date.now(),
        modified: Date.now(),
      },
      var: {
        type: 'directory',
        children: {
          log: {
            type: 'directory',
            children: {
              'syslog': {
                type: 'file',
                content: 'Apr 16 00:00:00 ubuntu-terminal systemd[1]: Started User Manager for UID 1000.\nApr 16 00:00:01 ubuntu-terminal systemd[1]: Starting System Logger...\nApr 16 00:00:01 ubuntu-terminal systemd[1]: Started System Logger.',
                owner: 'root',
                permissions: 'rw-r--r--',
                created: Date.now(),
                modified: Date.now(),
              }
            },
            owner: 'root',
            permissions: 'rwxr-xr-x',
            created: Date.now(),
            modified: Date.now(),
          }
        },
        owner: 'root',
        permissions: 'rwxr-xr-x',
        created: Date.now(),
        modified: Date.now(),
      },
      tmp: {
        type: 'directory',
        children: {},
        owner: 'root',
        permissions: 'rwxrwxrwx',
        created: Date.now(),
        modified: Date.now(),
      },
      root: {
        type: 'directory',
        children: {
          '.bashrc': {
            type: 'file',
            content: '# ~/.bashrc: executed by bash for non-login shells\n# Root user specific settings\nPS1="\\[\\033[01;31m\\]\\u@\\h:\\w\\$\\[\\033[00m\\] "',
            owner: 'root',
            permissions: 'rw-------',
            created: Date.now(),
            modified: Date.now(),
          }
        },
        owner: 'root',
        permissions: 'rwx------',
        created: Date.now(),
        modified: Date.now(),
      }
    },
    owner: 'root',
    permissions: 'rwxr-xr-x',
    created: Date.now(),
    modified: Date.now(),
  },
  currentUser: 'ubuntu',
  users: {
    root: {
      password: 'toor', // Default password for root
      isAdmin: true,
      homeDir: '/root'
    },
    ubuntu: {
      password: 'ubuntu', // Default password for ubuntu
      isAdmin: false,
      homeDir: '/home/ubuntu'
    }
  }
};

export const FS_STORAGE_KEY = 'ubuntu-terminal-fs';

// Load file system from localStorage or use default
export const loadFileSystem = (): FileSystem => {
  const stored = localStorage.getItem(FS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored file system, using default');
      return defaultFileSystem;
    }
  }
  return defaultFileSystem;
};

// Save file system to localStorage
export const saveFileSystem = (fs: FileSystem): void => {
  localStorage.setItem(FS_STORAGE_KEY, JSON.stringify(fs));
};

// Helper to navigate file system paths
export const resolvePath = (fs: FileSystem, path: string, currentPath: string): string => {
  if (path.startsWith('/')) {
    return path; // absolute path
  }
  
  if (path === '~') {
    return fs.users[fs.currentUser]?.homeDir || '/home/' + fs.currentUser;
  }
  
  if (path.startsWith('~/')) {
    const homeDir = fs.users[fs.currentUser]?.homeDir || '/home/' + fs.currentUser;
    return homeDir + path.slice(1);
  }
  
  // Handle .. and .
  const segments = path.split('/').filter(Boolean);
  const currentSegments = currentPath.split('/').filter(Boolean);
  
  for (const segment of segments) {
    if (segment === '..') {
      if (currentSegments.length > 0) {
        currentSegments.pop();
      }
    } else if (segment !== '.') {
      currentSegments.push(segment);
    }
  }
  
  return '/' + currentSegments.join('/');
};

// Get a node at a given path
export const getNode = (fs: FileSystem, path: string): FileSystemNode | null => {
  if (path === '/') {
    return fs.root;
  }
  
  const segments = path.split('/').filter(Boolean);
  let current: FileSystemNode = fs.root;
  
  for (const segment of segments) {
    if (!current.children || !current.children[segment]) {
      return null;
    }
    current = current.children[segment];
  }
  
  return current;
};

// Deep clone a node
const cloneNode = (node: FileSystemNode): FileSystemNode => {
  const clone: FileSystemNode = {
    type: node.type,
    owner: node.owner,
    permissions: node.permissions,
    created: node.created,
    modified: Date.now()
  };
  
  if (node.content !== undefined) {
    clone.content = node.content;
  }
  
  if (node.children) {
    clone.children = {};
    Object.entries(node.children).forEach(([name, childNode]) => {
      clone.children![name] = cloneNode(childNode);
    });
  }
  
  return clone;
};

// Create a new file or directory
export const createNode = (
  fs: FileSystem, 
  path: string, 
  type: 'file' | 'directory', 
  content: string = ''
): boolean => {
  const lastSlashIndex = path.lastIndexOf('/');
  const parentPath = lastSlashIndex <= 0 ? '/' : path.substring(0, lastSlashIndex);
  const name = path.substring(lastSlashIndex + 1);
  
  if (!name) return false;
  
  const parentNode = getNode(fs, parentPath);
  if (!parentNode || parentNode.type !== 'directory') return false;
  
  if (!parentNode.children) {
    parentNode.children = {};
  }
  
  // Check if node already exists
  if (parentNode.children[name]) return false;
  
  parentNode.children[name] = {
    type,
    owner: fs.currentUser,
    permissions: type === 'file' ? 'rw-r--r--' : 'rwxr-xr-x',
    created: Date.now(),
    modified: Date.now()
  };
  
  if (type === 'file') {
    parentNode.children[name].content = content;
  } else {
    parentNode.children[name].children = {};
  }
  
  saveFileSystem(fs);
  return true;
};

// Delete a file or directory
export const deleteNode = (fs: FileSystem, path: string): boolean => {
  const lastSlashIndex = path.lastIndexOf('/');
  const parentPath = lastSlashIndex <= 0 ? '/' : path.substring(0, lastSlashIndex);
  const name = path.substring(lastSlashIndex + 1);
  
  if (!name) return false;
  
  const parentNode = getNode(fs, parentPath);
  if (!parentNode || parentNode.type !== 'directory' || !parentNode.children) return false;
  
  if (!parentNode.children[name]) return false;
  
  delete parentNode.children[name];
  saveFileSystem(fs);
  return true;
};

// Copy a file or directory
export const copyNode = (fs: FileSystem, sourcePath: string, destinationPath: string): boolean => {
  const sourceNode = getNode(fs, sourcePath);
  if (!sourceNode) return false;
  
  // Handle destination
  let destDirPath: string;
  let destName: string;
  
  const destNode = getNode(fs, destinationPath);
  if (destNode && destNode.type === 'directory') {
    // If destination is a directory, copy into it with the same source name
    const sourceNameMatch = sourcePath.match(/([^/]+)$/);
    if (!sourceNameMatch) return false;
    
    destDirPath = destinationPath;
    destName = sourceNameMatch[1];
  } else {
    // Otherwise treat destination as the full target path
    const lastSlash = destinationPath.lastIndexOf('/');
    if (lastSlash < 0) return false;
    
    destDirPath = destinationPath.substring(0, lastSlash) || '/';
    destName = destinationPath.substring(lastSlash + 1);
  }
  
  const destDir = getNode(fs, destDirPath);
  if (!destDir || destDir.type !== 'directory') return false;
  
  if (!destDir.children) {
    destDir.children = {};
  }
  
  // Clone source node to destination
  destDir.children[destName] = cloneNode(sourceNode);
  
  saveFileSystem(fs);
  return true;
};

// Move a file or directory
export const moveNode = (fs: FileSystem, sourcePath: string, destinationPath: string): boolean => {
  if (copyNode(fs, sourcePath, destinationPath)) {
    return deleteNode(fs, sourcePath);
  }
  return false;
};

// Change permissions
export const changePermissions = (fs: FileSystem, path: string, mode: string): boolean => {
  const node = getNode(fs, path);
  if (!node) return false;
  
  // Very basic mode validation
  if (!/^[r-][w-][x-][r-][w-][x-][r-][w-][x-]$/.test(mode)) {
    // Simple mode interpretation, accepting basic rwxrwxrwx format
    node.permissions = mode;
    saveFileSystem(fs);
    return true;
  }
  
  return false;
};

// Authentication
export const authenticateUser = (
  fs: FileSystem,
  username: string,
  password: string
): boolean => {
  if (!fs.users[username]) return false;
  return fs.users[username].password === password;
};

// Switch user
export const switchUser = (fs: FileSystem, username: string): boolean => {
  if (!fs.users[username]) return false;
  fs.currentUser = username;
  saveFileSystem(fs);
  return true;
};

// Add a new user
export const addUser = (
  fs: FileSystem,
  username: string,
  password: string,
  isAdmin: boolean = false
): boolean => {
  if (fs.users[username]) return false;
  
  fs.users[username] = {
    password,
    isAdmin,
    homeDir: `/home/${username}`
  };
  
  // Create home directory for the user
  createNode(fs, `/home/${username}`, 'directory');
  
  // Add default .bashrc file
  const homeDir = getNode(fs, `/home/${username}`);
  if (homeDir && homeDir.children) {
    homeDir.children['.bashrc'] = {
      type: 'file',
      content: `# ~/.bashrc for ${username}\n# User specific settings\nPS1="\\[\\033[01;32m\\]\\u@\\h:\\w\\$\\[\\033[00m\\] "`,
      owner: username,
      permissions: 'rw-r--r--',
      created: Date.now(),
      modified: Date.now()
    };
  }
  
  saveFileSystem(fs);
  return true;
};
