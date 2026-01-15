
import Terminal from '@/components/Terminal';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Ubuntu Terminal Simulator</h1>
        
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden h-[75vh]">
          <Terminal />
        </div>
        
        <div className="mt-6 text-gray-300 text-sm">
          <h2 className="text-xl font-semibold text-white mb-2">Available Commands:</h2>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <li><span className="text-green-400">cd</span> - Change directory</li>
            <li><span className="text-green-400">ls</span> - List files</li>
            <li><span className="text-green-400">mkdir</span> - Create directory</li>
            <li><span className="text-green-400">touch</span> - Create file</li>
            <li><span className="text-green-400">cat</span> - Show file contents</li>
            <li><span className="text-green-400">rm</span> - Remove files</li>
            <li><span className="text-green-400">echo</span> - Output text</li>
            <li><span className="text-green-400">clear</span> - Clear terminal</li>
            <li><span className="text-green-400">whoami</span> - Show current user</li>
            <li><span className="text-green-400">sudo</span> - Run as admin</li>
            <li><span className="text-green-400">su</span> - Switch user</li>
            <li><span className="text-green-400">apt-get</span> - Package manager</li>
            <li><span className="text-green-400">grep</span> - Search for patterns</li>
            <li><span className="text-green-400">man</span> - Show manual pages</li>
            <li><span className="text-green-400">ps</span> - Show processes</li>
            <li><span className="text-green-400">top</span> - System monitor</li>
            <li><span className="text-green-400">uname</span> - System info</li>
            <li><span className="text-green-400">date</span> - Show date/time</li>
            <li><span className="text-green-400">df</span> - Disk usage</li>
            <li><span className="text-green-400">cp</span> - Copy files</li>
            <li><span className="text-green-400">mv</span> - Move files</li>
            <li><span className="text-green-400">pwd</span> - Print working dir</li>
            <li><span className="text-green-400">chmod</span> - Change permissions</li>
            <li><span className="text-green-400">help</span> - Show all commands</li>
          </ul>
          <p className="mt-4">
            <strong>Note:</strong> File system is persistent and stored in your browser's localStorage.
            Default users: <code className="bg-gray-700 px-1 rounded">ubuntu</code> (password: ubuntu) and <code className="bg-gray-700 px-1 rounded">root</code> (password: toor)
          </p>
          <p className="mt-2">
            <strong>Pro Tip:</strong> Use Tab for command autocomplete and arrow keys for command history.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
