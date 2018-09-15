const electron = require('electron');
const {app, BrowserWindow, dialog, Menu, ipcRenderer} = electron;

const debug = true;

function dumpDb(menuItem, BrowserWindow, event) {
  let date_str = (new Date()).toLocaleString(
    'en-GB', {year:'numeric', day: 'numeric', month: 'numeric'}
  ).split('/').join('')
  let ws = fs.createWriteStream('db-' + date_str + '.json');
  db.dump(ws).then(function (res) {
    BrowserWindow.webContents.send('ipcAlertMessage', 'Backup Created!');
  });
}

function restoreDb(menuItem, BrowserWindow, event) {
  dialog.showOpenDialog(
    {properties: ['openFile'], filters: [{extensions: ['json'] }]},
    function (filePaths) {
      var rs = fs.createReadStream(filePaths[0]);
      db.load(rs).then(function() {
        BrowserWindow.webContents.send('ipcAlertMessage', 'Backup Restored!');
        if (debug == true) {
          console.log('restored db');
        }
      }).catch(function (err) {
        if (debug == true) {
          console.log('failed to restore db');
        }
      })
    }
  )
}

const template = [
  {
    label: 'Database',
    submenu: [
      {
        label: 'Backup Database',
        click: (item, focusedWindow, event) => { dumpDb(item, focusedWindow, event) }
      },
      {
        label: 'Restore Database',
        click: (item, focusedWindow, event) => { restoreDb() }
      },
      {
        label: 'Quit',
        accelerator: 'Cmd+Q',
        click: () => { app.quit(); }
      }
    ]
  },
]
const menu = Menu.buildFromTemplate(template)

const crypto = require('crypto')
const db_name = 'electron-db';

// reload electron on change
if (debug == true) {
  const path = require('path')
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
  });
}

var PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));
var db = new PouchDB(db_name);

// Toolset to backup db
var fs = require('fs');
var replicationStream = require('pouchdb-replication-stream');
PouchDB.plugin(replicationStream.plugin);
PouchDB.adapter('writableStream', replicationStream.adapters.writableStream);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 800, height: 600});

  // and load the index.html of the app.
  win.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
  win.webContents.openDevTools();

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  })
}

function createMenu() {
  Menu.setApplicationMenu(menu)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);
app.on('ready', createMenu);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

var ipc = electron.ipcMain;

ipc.on('addUser', function(event, data) {
  // check if a doc with same car_plate exists
  db.find({
    selector: buildUserSelector({car_plate: data["car_plate"]}),
  }).then(function (result) {
    if (result.docs.length === 0 && data['name'] && data['car_plate']) {
      let doc = {
        _id: crypto.randomBytes(20).toString('hex'),
        type: "user",
        car_plate: data["car_plate"],
        name: data["name"],
      };
      if (debug == true) {
        console.log('adding user');
        console.log(doc);
      }
      db.put(doc).then(function (response) {
      }).catch(function (err) {
        if (debug == true) {
          console.log(err);
        }
      });
    } else {
      if (debug == true) {
        console.log('user already exists');
      }
      event.sender.send('ipcRecordConflict');
    }
  }).catch(function (err) {
    if (debug == true) {
      console.log(err);
    }
  });
})

ipc.on('deleteDoc', function(event, doc_id) {
  db.get(doc_id).then(function(doc) {
    db.remove(doc).then(function (result) {
      if (debug == true) {
        console.log('deleted ' + doc['type']);
      }
      event.sender.send('ipcRecordDeleted', result['doc_id']);
    });
  });
});

ipc.on('updateDoc', function(event, doc_id, field, value) {
  db.get(doc_id).then(function(doc) {
    doc[field] = value;
    if (debug == true) {
      console.log('updating ' + doc['type']);
    }
    db.put(doc).then(function (result) {
      event.sender.send('ipcRecordUpdated', result['id']);
    }).catch(function(err) {
      if (debug == true) {
        console.log(err);
      }
    });
  });
});

ipc.on('addService', function(event, user_id, data) {
  if (data['description'] && data['date']) {
    let doc = {
      _id: crypto.randomBytes(20).toString('hex'),
      type: "service",
      user: user_id,
      description: data["description"],
      date: data["date"],
      km: data["km"]
    };
      if (debug == true) {
      console.log('adding service');
      console.log(doc);
      }
    db.put(doc).then(function (response) {
    }).catch(function (err) {
      if (debug == true) {
        console.log(err);
      }
    });
  }
});

ipc.on('fetchUsers', function(event, data) {
  if (debug == true) {
    console.log('fetching users');
  }
  db.find({
    selector: buildUserSelector(data),
  }).then(function (result) {
    if (debug == true) {
      console.log(result);
    }
    event.sender.send('ipcFetchUsers', result.docs);
  }).catch(function (err) {
    if (debug == true) {
      console.log(err);
    }
  });
});

function buildUserSelector(data) {
  let selector = {type: "user"};

  if (data['_id']) {
    selector = {_id: data['_id']};
  } else if (data['car_plate']) {
    let regex = RegExp(data['car_plate'], "i");
    selector = {car_plate: {$regex: regex}};
  } else if (data['name']) {
    let regex = RegExp(".*" + data['name'] + ".*", "i");
    selector = {
      name: {$regex: regex},
    };
  }
  if (debug == true) {
    console.log(selector);
  }
  return selector;
}

ipc.on('fetchServices', function(event, data) {
  db.find({
    selector: {type: "service", user_id: data['user_id']},
  }).then(function (result) {
    if (debug == true) {
      console.log('fetched services');
      console.log(result);
    }
    event.sender.send('ipcFetchServices', result.docs);
  }).catch(function (err) {
    if (debug == true) {
      console.log(err);
    }
  });
});

ipc.on('resetDb', function(event, data) {
  if (debug == true) {
    console.log('Recreating DB')
  }
  db.destroy();
  db = new PouchDB(db_name);
});
