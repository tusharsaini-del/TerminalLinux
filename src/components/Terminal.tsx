
import React, { useState, useEffect, useRef } from 'react';
import { 
  processCommand, 
  addToHistory, 
  getPreviousCommand, 
  getNextCommand,
  initialTerminalState,
  getAutocompleteOptions
} from '@/lib/commandProcessor';
import { loadFileSystem } from '@/lib/terminalStorage';

const Terminal: React.FC = () => {
  const [state, setState] = useState({...initialTerminalState});
  const [autocompleteOptions, setAutocompleteOptions] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus on terminal input whenever anything is clicked
  useEffect(() => {
    const handleClick = () => {
      inputRef.current?.focus();
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  
  // Scroll to bottom when output changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [state.output]);
  
  // Initialize file system on first load
  useEffect(() => {
    loadFileSystem();
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({
      ...prev,
      currentInput: e.target.value,
      inputPosition: e.target.selectionStart || 0
    }));
    setShowAutocomplete(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setShowAutocomplete(false);
      
      const command = state.currentInput.trim();
      
      if (state.isPasswordMode || state.sudoMode) {
        // Handle password submission
        const result = processCommand(command, state, command);
        
        setState(prev => ({
          ...prev,
          output: [...prev.output, state.isPasswordMode ? '*'.repeat(command.length) : command, ...result.output],
          currentInput: '',
          inputPosition: 0,
          isPasswordMode: result.isPasswordMode || false,
          tempUser: result.tempUser || '',
          sudoMode: result.sudoMode || false,
          sudoCommand: result.sudoCommand || '',
          currentPath: result.newPath || prev.currentPath
        }));
      } else {
        // Regular command processing
        if (command) {
          addToHistory(command);
        }
        
        const result = processCommand(command, state);
        
        // Special handling for clear command
        if (result.output.length === 1 && result.output[0] === 'CLEAR_TERMINAL') {
          setState(prev => ({
            ...prev,
            output: [],
            currentInput: '',
            inputPosition: 0,
            isPasswordMode: result.isPasswordMode || false,
            tempUser: result.tempUser || '',
            sudoMode: result.sudoMode || false,
            sudoCommand: result.sudoCommand || '',
            currentPath: result.newPath || prev.currentPath
          }));
          return;
        }
        
        setState(prev => ({
          ...prev,
          output: [...prev.output, `${getPrompt(prev.currentPath)} ${command}`, ...result.output],
          currentInput: '',
          inputPosition: 0,
          isPasswordMode: result.isPasswordMode || false,
          tempUser: result.tempUser || '',
          sudoMode: result.sudoMode || false,
          sudoCommand: result.sudoCommand || '',
          currentPath: result.newPath || prev.currentPath
        }));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setShowAutocomplete(false);
      const prevCommand = getPreviousCommand();
      if (prevCommand) {
        setState(prev => ({
          ...prev,
          currentInput: prevCommand,
          inputPosition: prevCommand.length
        }));
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowAutocomplete(false);
      const nextCommand = getNextCommand();
      setState(prev => ({
        ...prev,
        currentInput: nextCommand,
        inputPosition: nextCommand.length
      }));
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (showAutocomplete && autocompleteOptions.length > 0) {
        setState(prev => ({
          ...prev,
          currentInput: autocompleteOptions[0],
          inputPosition: autocompleteOptions[0].length
        }));
        setShowAutocomplete(false);
      } else {
        const options = getAutocompleteOptions(state.currentInput, state.currentPath);
        if (options.length === 1) {
          setState(prev => ({
            ...prev,
            currentInput: options[0],
            inputPosition: options[0].length
          }));
        } else if (options.length > 1) {
          setAutocompleteOptions(options);
          setShowAutocomplete(true);
        }
      }
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
    }
  };
  
  // Generate the terminal prompt
  const getPrompt = (path: string) => {
    const fs = loadFileSystem();
    return `${fs.currentUser}@terminal:${path}$`;
  };
  
  const selectAutocomplete = (option: string) => {
    setState(prev => ({
      ...prev,
      currentInput: option,
      inputPosition: option.length
    }));
    setShowAutocomplete(false);
    inputRef.current?.focus();
  };
  
  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-[#300A24] text-white p-2 flex justify-between items-center rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-red-500"></div>
          <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
        </div>
        <div>Terminal - Ubuntu 22.04 LTS</div>
        <div className="w-12"></div> {/* Spacer for balance */}
      </div>
      
      <div 
        ref={terminalRef}
        className="flex-1 bg-[#300A24] text-white p-4 font-mono text-sm overflow-y-auto relative"
      >
        <div className="pb-10"> {/* Add padding to ensure scroll area includes command input */}
          {state.output.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-words">
              {Array.isArray(line) ? line.map((l, j) => (
                <div key={`${i}-${j}`}>{l}</div>
              )) : line}
            </div>
          ))}
          
          <div className="flex items-center relative">
            {!state.isPasswordMode && !state.sudoMode && (
              <span className="text-green-400 mr-2">
                {getPrompt(state.currentPath)}
              </span>
            )}
            {state.isPasswordMode && (
              <span className="text-yellow-400 mr-2">
                Password:
              </span>
            )}
            {state.sudoMode && (
              <span className="text-yellow-400 mr-2">
                [sudo] password for {loadFileSystem().currentUser}:
              </span>
            )}
            <input
              ref={inputRef}
              type={state.isPasswordMode || state.sudoMode ? "password" : "text"}
              value={state.currentInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="bg-transparent border-none outline-none text-white flex-1 w-full caret-white"
              autoFocus
            />
            
            {/* Autocomplete suggestions */}
            {showAutocomplete && autocompleteOptions.length > 0 && (
              <div className="absolute bottom-full left-0 bg-gray-800 border border-gray-600 rounded-md overflow-hidden shadow-lg z-10 w-full max-h-32 overflow-y-auto">
                {autocompleteOptions.map((option, index) => (
                  <div 
                    key={index} 
                    className="px-3 py-1 hover:bg-gray-700 cursor-pointer"
                    onClick={() => selectAutocomplete(option)}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
