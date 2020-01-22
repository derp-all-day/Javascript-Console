let tty = {
  eval: (function (c) {
    if (typeof c == 'object') {
      return (JSON && JSON.stringify ? JSON.stringify(c, undefined, 4) : String(c));
    } else {
      return c;
    }
  }),
  console: (function(c){
    try {
      return eval("tty.eval(" + c + ")");
    } catch(e) {
      try {
        return eval(c);
      } catch(e2) {
        return e2;
      }
    }
  }),
}
function fauxTerm(config) {
  var term = config.el || document.getElementById('term');
  var termBuffer = config.initialMessage || '';
  var lineBuffer = config.initialLine || '';
  var cwd = config.cwd || "~/";
  var tags = config.tags || ['red', 'blue', 'white', 'bold'];
  var processCommand = config.cmd || false;
  var maxBufferLength = config.maxBufferLength || 8192;
  var commandHistory = [];
  var currentCommandIndex = -1;
  var maxCommandHistory = config.maxCommandHistory || 100;
  var autoFocus = config.autoFocus || false;
  var coreCmds = {
    "clear": clear
  }; 
  var fauxInput = document.createElement('textarea');
  fauxInput.className = "faux-input";
  document.body.appendChild(fauxInput);
  if ( autoFocus ) {
    fauxInput.focus();
  }
  function getLeader() {
    return cwd + "$ ";
  }
  function renderTerm() {
    var bell = '<span class="bell" onload="this.focus()"></span>';
    var ob = termBuffer + getLeader() + lineBuffer;
    term.innerHTML = ob;
    term.innerHTML += bell;
    term.scrollTop = term.scrollHeight;
  }
  function writeToBuffer(str) {
    termBuffer += str;
    
    //Stop the buffer getting massive.
    if ( termBuffer.length > maxBufferLength ) {
      var diff = termBuffer.length - maxBufferLength;
      termBuffer = termBuffer.substr(diff);
    }
    
  }
  function clear(argv, argc) {
    termBuffer = "";
    return "";
  }
  function isCoreCommand(line) {
    if ( coreCmds.hasOwnProperty(line) ) {
      return true;
    }
    return false;
  }
  function coreCommand(argv, argc) {
    var cmd = argv[0];
    return coreCmds[cmd](argv, argc);
  }
  function processLine() {
    //Dispatch command
    var stdout, line = lineBuffer, argv = line.split(" "), argc = argv.length;
    var cmd = argv[0];
    lineBuffer += "\n";
    writeToBuffer( getLeader() + lineBuffer );
    lineBuffer = "";
    //If it's not a blank line.
    if ( cmd !== "" ) {
      //If the command is not registered by the core.
      if ( !isCoreCommand(cmd) ) {
        stdout = tty.console(cmd);
      } else {
        //Execute a core command
        stdout = coreCommand(argv,argc);
      }
      //If an actual command happened.
      if ( stdout === false ) {
        stdout = tty.console(cmd);
      }
      writeToBuffer(syntaxHighLight(stdout)+"<br />");
      addLineToHistory(line);
    }
    renderTerm();
  }
  function addLineToHistory(line) {
    commandHistory.unshift( line );
    currentCommandIndex = -1;
    if ( commandHistory.length > maxCommandHistory ) {
      console.log('reducing command history size');
      console.log(commandHistory.length);
      var diff = commandHistory.length - maxCommandHistory;
      commandHistory.splice(commandHistory.length -1, diff);
      console.log(commandHistory.length);
    }
  }
  function isInputKey(keyCode) {
    var inputKeyMap = [32,190,192,189,187,220,221,219,222,186,188,191];
    if ( inputKeyMap.indexOf(keyCode) > -1 ) {
      return true;
    }
    return false;
  }
  function toggleCommandHistory(direction) {
    var max = commandHistory.length -1;
    var newIndex = currentCommandIndex + direction;
    if ( newIndex < -1 ) newIndex = -1;
    if ( newIndex >= commandHistory.length) newIndex = commandHistory.length -1;
    if ( newIndex !== currentCommandIndex ) {
      currentCommandIndex = newIndex;
    }
    if ( newIndex > -1 ) {
      //Change line to something from history.
      lineBuffer = commandHistory[newIndex];
    } else {
      //Blank line...
      lineBuffer = "";
    }
  }
  function acceptInput(e) {
    e.preventDefault();
     fauxInput.value = "";
    if ( e.keyCode >= 48 && e.keyCode <= 90 || isInputKey(e.keyCode) ) {
      if (! e.ctrlKey ) {
        //Character input
        lineBuffer += e.key;
      } else {
        //Hot key input? I.e Ctrl+C
      }
    } else if ( e.keyCode === 13 ) {
      processLine();
    } else if ( e.keyCode === 9 ) {
      lineBuffer += "\t";
    } else if ( e.keyCode === 38 ) {
      toggleCommandHistory(1);
    } else if ( e.keyCode === 40 ) {
      toggleCommandHistory(-1);
    }
    else if ( e.key === "Backspace" ) {
      lineBuffer = lineBuffer.substr(0, lineBuffer.length -1);
    }
    renderTerm();
  }
  term.addEventListener('click', function(e){
    fauxInput.focus();
    term.classList.add('term-focus');
  });
  fauxInput.addEventListener('keydown', acceptInput);
  fauxInput.addEventListener('blur', function(e){
    term.classList.remove('term-focus');
  });
  renderTerm();
}
var myTerm = new fauxTerm({
  el: document.getElementById("term"),
  cwd: "<span class='tty-term'>guest</span><span class='js-no-output'>@</span>"+
  "<span class='tty-term'>ip</span><span class='js-no-output'>:</span><span class='tty-path'>/domain/</span>",
  initialMessage: "Javascript Console 2.0!\n",
  tags: ['red', 'blue', 'white', 'bold'],
  maxBufferLength: 8192,
  maxCommandHistory: 500,
  autoFocus: true
});
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function syntaxHighLight(codex) {
  if(typeof codex === 'undefined') {
    return "<span class='js-no-output'>undefined</span>";
  } else if(typeof codex !== 'string') {
    return "<span class='js-error'>"+codex+"</span>";
  }
   var data = codex; 
   data = data.replace(/"(.*?)"/g, '<span class="js-string">"$1"</span>');
   data = data.split('{').join('<span class="js-braces"><b>{</b></span>');
   data = data.split('}').join('<span class="js-braces"><b>}</b></span>');
   data = data.split('[').join('<span class="js-braces"<b>>[</b></span>');
   data = data.split(']').join('<span class="js-braces"><b>]</b></span>');
   data = data.split(':').join('<span class="js-braces"><b>:</b></span>');
   data = data.replace(/\/\/(.*?)/g, '<span class="js-comment">#$1</span>');
   data = data.replace(/&lt;(.*?)&gt;/g, "<span class='code-ele'>&lt;$1&gt;</span>");
   data = data.replace(/\/\*(.*?)\*\//g, "<span class='code-comment'>/*$1*/;</span>");
   return data;
}
