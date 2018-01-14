// main script file to set listers with jQuery and route click events
require('bootstrap'); // load all of Bootstrap's jQuery plugins
var ipc = require('electron').ipcRenderer;

var btnUserAddIndex = null;
var tblUsers = null;
var tblServices = null;

var user_id = null;
var gl_users = {};

// wait for document to load
document.addEventListener('DOMContentLoaded', function () {

  document.onreadystatechange = function () {
    if (document.readyState === "complete") {
      initListeners();
    }
  }

  // initialize users dataTable
  tblUsers = $('#tbl-users').DataTable({
    ordering: false,
    searching: false
  });

  tblServices = $('#tbl-services').DataTable({
    ordering: false,
    searching: false
  });

  // Fetch initial users
  ipc.send('fetchUsers', {"full_name": null, "car_plate": null});
});

function addUser() {
  let inpUserName = document.getElementById('inp-user-name').value;
  let inpCarPlate = document.getElementById('inp-car-plate').value;
  if (inpUserName && inpCarPlate) {
    let data = {"full_name": inpUserName, "car_plate": inpCarPlate};
    ipc.send('addUser', data);
  }
}

function deleteUser(_user_id) {
  ipc.send('deleteUser', _user_id);
}

function searchUsers(full_name, car_plate) {
  let inpUserName = document.getElementById('inp-user-name').value;
  let inpCarPlate = document.getElementById('inp-car-plate').value;
  let user_data = {"full_name": inpUserName, "car_plate": inpCarPlate};
  ipc.send('fetchUsers', user_data);
}

function addService() {
  let inpDate = document.getElementById('inp-date').value;
  let inpKm = document.getElementById('inp-km').value;
  let inpDescription = document.getElementById('inp-description').value;
  let service_data = {"description": inpDescription, "km": inpKm,  "date": inpDate}
  // TODO: pass user_id
  ipc.send('addService', user_id, service_data);
}

function populateUserList(users) {
  // datatable API
  if (tblUsers.rows()[0].length > 0) {
    tblUsers.clear().draw();
  }
  if (users.length > 0) {
    users.forEach((user, index) => {
      tblUsers.row.add([
        index + 1,
        user.name,
        user.car_plate,
        '<button type="button" class="btn btn-outline-danger" id="btn-user-delete" data-userid="'
        + user._id +'"><span class="icon icon-minus-circled"></span></button>' +
        '<button type="button" class="btn btn-outline-warning" data-toggle="modal" data-target="#modal-user-edit" data-userid="'
        + user._id +'"><span class="icon icon-pencil"></span></button>' +
        '<button type="button" class="btn btn-outline-primary" data-toggle="modal" data-target="#modal-user-view" data-userid="' +
        + user._id +'"><span class="icon icon-eye"></span></button>'
      ]);
    });
    tblUsers.draw();
  }
}

function populateServiceList(services) {
  // datatable API
  if (tblServices.rows()[0].length > 0) {
    tblServices.clear().draw();
  }

  services.forEach((service, index) => {
    tblServices.row.add([
      index + 1,
      service.date,
      service.km,
      service.description,
      '<button type="button" class="btn btn-outline-danger" data-serviceid="'
      + service._id +'"><span class="icon icon-minus-circled"></span></button>'
    ]);
  });
  tblServices.draw();
}

function initListeners() {
  // Handle ipc events
  ipc.on('ipcFetchUsers', function(event, users) {
    users.forEach(function(el) {
      gl_users[el['_id']] = el;
    });

    populateUserList(users);
  });

  ipc.on('ipcFetchServices', function(event, response) {
    populateServiceList(response);
  });

  ipc.on('ipcRecordConflict', function(event, response) {
    alert("Record already exists");
  });

  ipc.on('ipcRecordDeleted', function(event, response) {
      searchUsers();
  });

  $(document).ready(function() {
    // Register add user event
    btnUserAddIndex = document.getElementById('btn-user-add');
    btnUserAddIndex.addEventListener('click', function() {
      addUser();
    });

    // Register search user event
    btnSearchUser = document.getElementById('btn-user-search');
    btnSearchUser.addEventListener('click', function() {
      searchUsers();
    });

    $('#tbl-users #btn-user-delete').each(function() {
      $(this).click(function() {
        let _user_id = $(this).data('userid');
        if (_user_id) {
          deleteUser(_user_id);
        }
      });
    });
  });

  $('#modal-user-edit').on('show.bs.modal', function (event) {
    let modal = $(this);
    let button = $(event.relatedTarget);
    let user = gl_users[button.data('userid')];
  });

  // when the modal pops up
  $('#modal-user-view').on('show.bs.modal', function (event) {
    let modal = $(this);
    let button = $(event.relatedTarget);
    let _user_id = button.data('userid');
    modal.find('.modal-title').text(_user_id);
    ipc.send('fetchServices', _user_id);
  });

  btnVisitAdd = document.getElementById('btn-service-add');
  btnVisitAdd.addEventListener('click', function() {
    addService();
  });
};
