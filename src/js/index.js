// main script file to set listers with jQuery and route click events
require('bootstrap'); // load all of Bootstrap's jQuery plugins
var ipc = require('electron').ipcRenderer;

var btnUserAddIndex = null;
var tblUsers = null;
var tblServices = null;

var user_id = null;
var gl_users = {};
var _debug = null;

// wait for document to load
document.addEventListener('DOMContentLoaded', function () {

  document.onreadystatechange = function () {
    if (document.readyState === "complete") {
      initListeners();
    }
  }

  // initialize users dataTable
  tblUsers = $('#tbl-users').DataTable({
    'ordering': false,
    'searching': false,
    'pagingType': 'full_numbers',
    'pageLength': 50,
    'info': false,
    'lengthChange': false,
  });

  tblServices = $('#tbl-services').DataTable({
    'ordering': false,
    'searching': false,
    'pagingType': 'full_numbers',
    'pageLength': 10,
    'info': false,
    'lengthChange': false,
    'bAutoWidth': false,
    'aoColumns' : [
      { sWidth: '5%' },
      { sWidth: '20%' },
      { sWidth: '15%' },
      { sWidth: '60%' },
    ]
  });

  // Fetch initial users
  ipc.send('fetchUsers', {"name": null, "car_plate": null});
});

function addUser() {
  let inpUserName = document.getElementById('inp-user-name').value;
  let inpCarPlate = document.getElementById('inp-car-plate').value;
  if (inpUserName && inpCarPlate) {
    let data = {"name": inpUserName, "car_plate": inpCarPlate};
    ipc.send('addUser', data);
  }
}

function deleteUser(_user_id) {
  ipc.send('deleteDoc', _user_id);
}

function updateUser(_user_id, field_name, value) {
  ipc.send('updateDoc', _user_id, field_name, value);
}

function updateService(_service_id, field_name, value) {
  ipc.send('updateDoc', _service_id, field_name, value);
}

function searchUsers(name, car_plate) {
  let inpUserName = document.getElementById('inp-user-name').value;
  let inpCarPlate = document.getElementById('inp-car-plate').value;
  let user_data = {"name": inpUserName, "car_plate": inpCarPlate};
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
        '<div contenteditable=true id="div-user-field" data-userid=' + user._id + ' data-field="name">' + user.name + '</div>',
        '<div contenteditable=true id="div-user-field" data-userid=' + user._id + ' data-field="car_plate">' + user.car_plate + '</div>',
        '<button type="button" class="btn btn-outline-danger btn-sm btn-space" id="btn-user-delete" data-userid="'
        + user._id +'"><span class="icon icon-minus-circled"></span></button>' +
        '<button type="button" class="btn btn-outline-primary btn-sm" data-toggle="modal" data-target="#modal-user-view" data-userid="' +
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
      '<div contenteditable=true id="div-service-field" data-serviceid=' + service._id + ' data-field="date">' + service.date + '</div>',
      '<div contenteditable=true id="div-service-field" data-serviceid=' + service._id + ' data-field="km">' + service.km + '</div>',
      '<div contenteditable=true id="div-service-field" data-serviceid=' + service._id + ' data-field="description">' + service.description + '</div>',
      '<button type="button" class="btn btn-outline-danger btn-sm btn-space" id="btn-service-delete" data-serviceid="'
      + service._id +'"><span class="icon icon-minus-circled btn-sm"></span></button>'
    ]);
  });
  tblServices.draw();
}

function add_alert(message) {
  $('#alert-placeholder').html(
    '<div class="alert alert-warning alert-dismissible fade show" role="alert">' + message +
    '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>');
}

function initListeners() {
  // Handle ipc events
  ipc.on('ipcFetchUsers', function(event, users) {
    users.forEach(function(el) {
      gl_users[el['_id']] = el;
    });

    populateUserList(users);

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

    $('#tbl-users td div').each(function(event) {
      $(this).blur(function(event) {
        let _this = $(this);
        let _user_id = _this.data('userid');
        let field_name = _this.data('field');
        let new_value = this.innerText;
        updateUser(_user_id, field_name, new_value);
      });
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

  ipc.on('ipcFetchServices', function(event, response) {
    populateServiceList(response);
    $('#tbl-services td div').each(function(event) {
      $(this).blur(function(event) {
        let _this = $(this);
        let _service_id = _this.data('serviceid');
        let field_name = _this.data('field');
        let new_value = this.innerText;
        updateService(_service_id, field_name, new_value);
      });
    });
  });

  function deleteService(service_id) {
    ipc.send('deleteDoc', service_id);
  }

  ipc.on('ipcRecordConflict', function(event, response) {
    alert('Record already exists');
  });

  ipc.on('ipcRecordDeleted', function(event, response) {
      searchUsers();
  });

  ipc.on('ipcFetchServices', function(event, response) {
    $('#tbl-services #btn-service-delete').each(function() {
      $(this).click(function() {
        let service_id = $(this).data('serviceid');
        if (service_id) {
           deleteService(service_id);
        }
      });
    });
  });

  ipc.on('ipcAlertMessage', function(event, msg) {
    alert(msg);
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