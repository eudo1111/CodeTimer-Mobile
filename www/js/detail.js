var urlParams = new URLSearchParams(window.location.search);
init().then(()=>{

    if(setting.host=="" || typeof(setting.host)==="undefined")
    {
        alert("You have to set API setting first!");
        window.location.href="setting.html";
        return false;
    }

    if(urlParams.has('timesheet'))
    {
        itemId = urlParams.get('timesheet');
        loadItem()

    }
    else
    {
        renderNewItem()
    }

});

$(document).ready(function(){});


function loadItem(){
    var api = new API();
    api.makeAPICallAsync("get","/api/timesheets/"+itemId).then((item)=>{
        if(debug) console.log('item', item);
        renderItem(item);

        if(urlParams.has('active'))
        {
            renderActive();
        }
    });

}

function renderItem(item){

    var timeFrom = formatTime(item.begin);
    $('#time_from').val(timeFrom)
    var timeTo = formatTime(item.end);
    $('#time_to').val(timeTo)

    var dateFrom = formatDate(item.begin)
    $('#date').val(dateFrom)

    var totalDuration = formatDuration(item.duration);
    $('#time_total').val(totalDuration);

    $('#desc').val(item.description || '');

    renderItemCustomers();
    renderItemProjects();
    renderItemActivities();
    renderItemUsers();
    renderItemTags();

    // Set customer based on project (if project provided)
    if (typeof item.project !== 'undefined' && item.project !== null) {
        cache.projects.forEach(function(projectItem,key){
            if(item.project == projectItem.id)
            {
                updateCustomDropdownValue('customer', projectItem.customer);
                return false;
            }
        });
    }

    // Update custom dropdowns with selected values
    if (typeof item.project !== 'undefined' && item.project !== null) updateCustomDropdownValue('project', item.project);
    if (typeof item.activity !== 'undefined' && item.activity !== null) updateCustomDropdownValue('activity', item.activity);
    if (typeof item.user !== 'undefined' && item.user !== null) updateCustomDropdownValue('user', item.user);

    // tags in Kimai can be array -> pass all tags (or fallback to single tag)
    if (Array.isArray(item.tags) && item.tags.length) {
        // Normalize tags to simple values (id/name/tag) so updateCustomDropdownValue can resolve names
        const tagValues = item.tags.map(t => {
            if (typeof t === 'object' && t !== null) return (t.id || t.name || t.tag || String(t));
            return String(t);
        });
        updateCustomDropdownValue('tag', tagValues);
    } else if (typeof item.tag !== 'undefined' && item.tag !== null) {
        // single tag (string or object)
        if (typeof item.tag === 'object' && item.tag !== null) {
            updateCustomDropdownValue('tag', item.tag.id || item.tag.name || item.tag.tag || String(item.tag));
        } else {
            updateCustomDropdownValue('tag', String(item.tag));
        }
    }

    // Set up change listeners for custom dropdowns
    // Ensure we don't add multiple identical listeners by binding once
    if (!document._dropdownChangeBound) {
        document.addEventListener('dropdownChange', function(e) {
            const { type, value } = e.detail;
            if (type === 'customer') {
                renderUpdateProjectViaCustomer();
            } else if (type === 'project') {
                renderUpdateActivitiesViaProject();
            }
            else if (type === 'user') {
                renderUpdateUser();
            }
            else if (type === 'tag') {
                renderUpdateTag();
            }
        });
        document._dropdownChangeBound = true;
    }

    renderCallbacksForSelects();
}

function renderUpdateActivitiesViaProject(){

    var selectedProject = null;
    var projectEl = document.getElementById('projectSelected');
    if (projectEl) selectedProject = projectEl.getAttribute('data-value');

    if(selectedProject==0 || selectedProject=="" || selectedProject===null) return false;

    renderItemActivities();
    // Hide options not matching
    const options = document.querySelectorAll(`#activityOptions .dropdown-option`);
    options.forEach(function(opt){
        const dataProject = opt.getAttribute('data-project');
        if(dataProject && dataProject !== String(selectedProject) && dataProject !== "null") {
            opt.style.display = 'none';
        } else {
            opt.style.display = '';
        }
    });
}

function renderUpdateUser(){
    var selectedUser = null;
    var userEl = document.getElementById('userSelected');
    if (userEl) selectedUser = userEl.getAttribute('data-value');

    if(selectedUser==0 || selectedUser=="" || selectedUser===null) return false;

    renderItemUsers();
    const options = document.querySelectorAll(`#userOptions .dropdown-option`);
    options.forEach(function(opt){
        if(opt.getAttribute('data-value') !== String(selectedUser)) {
            opt.style.display = 'none';
        } else {
            opt.style.display = '';
        }
    });

    // if selected not present, reset to first
    if(!document.querySelector(`#userOptions .dropdown-option[data-value="${selectedUser}"]`)) {
        const first = document.querySelector('#userOptions .dropdown-option');
        if (first) selectOption('user', first.getAttribute('data-value'), first.querySelector('.option-text').textContent);
    }
}

function renderUpdateTag(){
    var tagEl = document.getElementById('tagSelected');
    // if no element, nothing to do
    if (!tagEl) return false;

    // current data-value may be comma-separated (multi-select) or empty
    var selectedTag = tagEl.getAttribute('data-value') || '';

    // always re-render options so list is up-to-date
    renderItemTags();
    const options = document.querySelectorAll(`#tagOptions .dropdown-option`);

    // build array of selected values
    const selectedValues = selectedTag.split(',').map(s => s.trim()).filter(s => s !== '');

    options.forEach(function(opt){
        const val = opt.getAttribute('data-value');
        // mark selected options, keep all options visible so user can add/remove tags
        if (selectedValues.length && selectedValues.indexOf(String(val)) !== -1) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
        opt.style.display = ''; // ensure option is visible
    });
}
function renderUpdateProjectViaCustomer(){
    var selectedCustomer = null;
    var customerEl = document.getElementById('customerSelected');
    if (customerEl) selectedCustomer = customerEl.getAttribute('data-value');

    var selectedProject = null;
    var projectEl = document.getElementById('projectSelected');
    if (projectEl) selectedProject = projectEl.getAttribute('data-value');

    if(selectedCustomer==0 || selectedCustomer=="" || selectedCustomer===null) return false;

    renderItemProjects();
    // Hide projects not matching customer
    const options = document.querySelectorAll(`#projectOptions .dropdown-option`);
    options.forEach(function(opt){
        const dataCustomer = opt.getAttribute('data-customer');
        if(dataCustomer && dataCustomer !== String(selectedCustomer) && dataCustomer !== "null") {
            opt.style.display = 'none';
        } else {
            opt.style.display = '';
        }
    });

    // if previously selected project is gone, pick first visible
    if(!document.querySelector(`#projectOptions .dropdown-option[data-value="${selectedProject}"]`)) {
        const firstVisible = Array.from(document.querySelectorAll('#projectOptions .dropdown-option')).find(o => o.style.display !== 'none');
        if (firstVisible) selectOption('project', firstVisible.getAttribute('data-value'), firstVisible.querySelector('.option-text').textContent);
    }
}

function renderActive(){
    $('#time_total').val('');
    $('#time_total').attr('readonly','readonly');
    $('#time_to').val('');
    $('#time_to').attr('readonly','readonly');
    $('.delete-item').remove();
}

function renderItemCustomers(){
    // Render custom dropdown
    renderCustomDropdown('customer', cache.customers);
}

function renderItemProjects(){
    // Render custom dropdown
    renderCustomDropdown('project', cache.projects);
}

function renderItemActivities(){
    // Render custom dropdown
    renderCustomDropdown('activity', cache.activities);
}

function renderItemUsers(){
    // Render custom dropdown
    renderCustomDropdown('user', cache.users);
}

function renderItemTags(){
    // Render custom dropdown
    // Note: cache.tags may be an array of strings or objects depending on API -> handle both
    renderCustomDropdown('tag', cache.tags);
}


// Custom dropdown functionality
function renderCustomDropdown(type, items) {
    const dropdown = document.getElementById(`${type}Dropdown`);
    const selected = document.getElementById(`${type}Selected`);
    const options = document.getElementById(`${type}Options`);

    if (!dropdown || !selected || !options) return;

    // Clear existing options
    options.innerHTML = '';

    // Add options to custom dropdown
    items.forEach(function(item, key) {
        let itemId, itemname;

        if (type === 'user') {
            itemId = (typeof item.id !== 'undefined') ? item.id : item;
            itemname = item.alias || item.name || item.username || itemId;
        } else if (type === 'tag') {
            if (typeof item === 'string') {
                itemId = item;
                itemname = item;
            } else if (typeof item === 'object' && item !== null) {
                itemId = item.id || item.name || item.tag || JSON.stringify(item);
                itemname = item.name || item.tag || itemId;
            } else {
                itemId = String(item);
                itemname = String(item);
            }
        } else {
            itemId = (typeof item.id !== 'undefined') ? item.id : item;
            itemname = item.name || item.title || itemId;
        }

        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.setAttribute('data-value', itemId);

        // optional extra data attributes for filtering
        if (type === 'project' && typeof item.customer !== 'undefined') option.setAttribute('data-customer', item.customer);
        if (type === 'activity' && typeof item.project !== 'undefined') option.setAttribute('data-project', item.project);

        option.innerHTML = `
            <span class="option-text">${itemname}</span>
            <i class="fas fa-${getIconForType(type)} option-icon"></i>
        `;

        // For tags allow multi-select (toggle). For others single-select.
        if (type === 'tag') {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleTagOption(itemId, itemname);
            });
        } else {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                selectOption(type, itemId, itemname);
            });
        }

        options.appendChild(option);
    });

    // Replace click handler to avoid duplicate listeners
    selected.onclick = function(e) {
        e.stopPropagation();
        toggleDropdown(type);
    };

    // Ensure outside click closes — bind once
    if (!document._customDropdownGlobalClickBound) {
        document.addEventListener('click', function(e) {
            ['customer', 'project', 'activity', 'user', 'tag'].forEach(function(t){
                const dd = document.getElementById(`${t}Dropdown`);
                if (dd && !dd.contains(e.target)) {
                    closeDropdown(t);
                }
            });
        });
        document._customDropdownGlobalClickBound = true;
    }

    // If selected already had a data-value set (from updateCustomDropdownValue), mark it visually
    const currentValue = selected.getAttribute('data-value');
    if (currentValue) {
        // currentValue may be comma-separated list for tags
        const values = (type === 'tag') ? currentValue.split(',').map(s=>s.trim()).filter(s=>s!=='') : [currentValue];
        values.forEach(v=>{
            const opt = options.querySelector(`.dropdown-option[data-value="${v}"]`);
            if (opt) opt.classList.add('selected');
        });
        // set display text for tags or single select
        if (type === 'tag') {
            const names = values.map(v=>{
                // resolve name from cache.tags if possible
                if (Array.isArray(cache.tags)) {
                    if (typeof cache.tags[0] === 'object') {
                        const t = cache.tags.find(tt => String(tt.id) === String(v) || String(tt.name) === String(v) || String(tt.tag) === String(v));
                        return t ? (t.name || t.tag || v) : v;
                    } else {
                        return cache.tags.find(tt => String(tt) === String(v)) || v;
                    }
                }
                return v;
            });
            selected.querySelector('.selected-text').textContent = names.length ? names.join(', ') : selected.querySelector('.selected-text').textContent;
        } else {
            const opt = options.querySelector(`.dropdown-option[data-value="${currentValue}"]`);
            if (opt) selected.querySelector('.selected-text').textContent = opt.querySelector('.option-text').textContent;
        }
    }
}

// add toggleTagOption helper for multi-select tags
function toggleTagOption(value, name) {
    const selected = document.getElementById('tagSelected');
    const options = document.getElementById('tagOptions');
    if (!selected || !options) return;

    const str = selected.getAttribute('data-value') || '';
    const arr = str === '' ? [] : str.split(',').map(s=>s.trim()).filter(s=>s!=='');
    const sval = String(value);
    const idx = arr.indexOf(sval);

    // toggle in array
    if (idx === -1) {
        arr.push(sval);
    } else {
        arr.splice(idx, 1);
    }

    // update option visual state
    const opt = options.querySelector(`.dropdown-option[data-value="${sval}"]`);
    if (opt) {
        if (idx === -1) opt.classList.add('selected');
        else opt.classList.remove('selected');
    }

    // update selected element data-value and label
    selected.setAttribute('data-value', arr.join(','));
    // build display names
    const names = arr.map(v=>{
        if (Array.isArray(cache.tags)) {
            if (typeof cache.tags[0] === 'object') {
                const t = cache.tags.find(tt => String(tt.id) === String(v) || String(tt.name) === String(v) || String(tt.tag) === String(v));
                return t ? (t.name || t.tag || v) : v;
            } else {
                return cache.tags.find(tt => String(tt) === String(v)) || v;
            }
        }
        return v;
    });
    selected.querySelector('.selected-text').textContent = names.length ? names.join(', ') : 'Select Tag';

    // dispatch change event with array of selected values
    const changeEvent = new CustomEvent('dropdownChange', {
        detail: { type: 'tag', value: arr, text: names.join(', ') }
    });
    document.dispatchEvent(changeEvent);
}

function getIconForType(type) {
    switch(type) {
        case 'customer': return 'building';
        case 'project': return 'folder';
        case 'activity': return 'tasks';
        case 'user': return 'user';
        case 'tag': return 'tags';
        default: return 'circle';
    }
}

function toggleDropdown(type) {
    const dropdown = document.getElementById(`${type}Dropdown`);
    const selected = document.getElementById(`${type}Selected`);
    const options = document.getElementById(`${type}Options`);

    if (!dropdown || !selected || !options) return;

    const isOpen = options.classList.contains('show');

    // Close all other dropdowns first
    closeAllDropdowns();

    if (!isOpen) {
        selected.classList.add('active');
        options.classList.add('show');
    }
}

function closeDropdown(type) {
    const dropdown = document.getElementById(`${type}Dropdown`);
    const selected = document.getElementById(`${type}Selected`);
    const options = document.getElementById(`${type}Options`);

    if (!dropdown || !selected || !options) return;

    selected.classList.remove('active');
    options.classList.remove('show');
}

function closeAllDropdowns() {
    ['customer', 'project', 'activity', 'user', 'tag'].forEach(type => {
        closeDropdown(type);
    });
}

function selectOption(type, value, text) {
    // non-tag single select behavior
    if (type === 'tag') return; // tags handled by toggleTagOption

    const selected = document.getElementById(`${type}Selected`);
    const options = document.getElementById(`${type}Options`);

    if (!selected || !options) return;

    // Update selected text
    selected.querySelector('.selected-text').textContent = text;

    // Store the selected value in a data attribute (always string)
    selected.setAttribute('data-value', (typeof value !== 'undefined' && value !== null) ? String(value) : '');

    // Update option selection
    options.querySelectorAll('.dropdown-option').forEach(option => {
        option.classList.remove('selected');
        if (option.getAttribute('data-value') === String(value)) {
            option.classList.add('selected');
        }
    });

    // Close dropdown
    closeDropdown(type);

    // Trigger custom change event
    const changeEvent = new CustomEvent('dropdownChange', {
        detail: { type: type, value: value, text: text }
    });
    document.dispatchEvent(changeEvent);
}

function updateCustomDropdownValue(type, value) {
    const selected = document.getElementById(`${type}Selected`);
    if (!selected) return;

    let name = 'Select ' + type.charAt(0).toUpperCase() + type.slice(1);

    // Find the name for the given value
    switch(type) {
        case 'customer':
            var customer = cache.customers.find(c => c.id == value);
            if (customer) name = customer.name;
            break;
        case 'project':
            var project = cache.projects.find(p => p.id == value);
            if (project) name = project.name;
            break;
        case 'activity':
            var activity = cache.activities.find(a => a.id == value);
            if (activity) name = activity.name;
            break;
        case 'user':
            var user = cache.users.find(u => u.id == value);
            if (user) name = user.alias || user.name;
            break;
        case 'tag':
            // accept array or comma-separated string or single value
            if (Array.isArray(value)) {
                const names = value.map(v=>{
                    if (Array.isArray(cache.tags)) {
                        if (typeof cache.tags[0] === 'object') {
                            const t = cache.tags.find(tt => String(tt.id) === String(v) || String(tt.name) === String(v) || String(tt.tag) === String(v));
                            return t ? (t.name || t.tag || v) : v;
                        } else {
                            return cache.tags.find(tt => String(tt) === String(v)) || v;
                        }
                    }
                    return v;
                });
                if (names.length) name = names.join(', ');
                selected.setAttribute('data-value', value.map(String).join(','));
            } else if (typeof value === 'string' && value.indexOf(',') !== -1) {
                const parts = value.split(',').map(s=>s.trim()).filter(s=>s!=='');
                const names = parts.map(v=>{
                    if (Array.isArray(cache.tags)) {
                        if (typeof cache.tags[0] === 'object') {
                            const t = cache.tags.find(tt => String(tt.id) === String(v) || String(tt.name) === String(v) || String(tt.tag) === String(v));
                            return t ? (t.name || t.tag || v) : v;
                        } else {
                            return cache.tags.find(tt => String(tt) === String(v)) || v;
                        }
                    }
                    return v;
                });
                if (names.length) name = names.join(', ');
                selected.setAttribute('data-value', parts.join(','));
            } else {
                // single tag
                if (Array.isArray(cache.tags)) {
                    if (typeof cache.tags[0] === 'object') {
                        const tagObj = cache.tags.find(t => t.id == value || t.name == value || t.tag == value);
                        if (tagObj) name = tagObj.name || tagObj.tag || String(value);
                    } else {
                        const tagStr = cache.tags.find(t => String(t) == String(value));
                        if (tagStr) name = tagStr;
                    }
                } else if (typeof value !== 'undefined' && value !== null) {
                    name = String(value);
                }
                if (typeof value !== 'undefined' && value !== null && value !== '') {
                    selected.setAttribute('data-value', String(value));
                } else {
                    selected.removeAttribute('data-value');
                }
            }
            break;
    }

    if (type !== 'tag') {
        if (typeof value !== 'undefined' && value !== null && value !== '') {
            selected.setAttribute('data-value', String(value));
        } else {
            selected.removeAttribute('data-value');
        }
    }

    selected.querySelector('.selected-text').textContent = name;
}

function deleteItem(){

    openLoadingDialog();
    //var button = Neutralino.os.showMessageBox('Confirm','Are you sure you want to delete?','YES_NO_CANCEL', 'QUESTION')
    navigator.notification.confirm('Are you sure you want to delete?',
        function(buttonIndex){
            var state = false;
            if(buttonIndex==1) state = "YES";
            if(debug) console.log('button state',state)
            if(state=="YES")
            {
                var api = new API()
                var resp = api.makeAPICall('delete','/api/timesheets/'+itemId);
                window.location.href='index.html'
            }
            closeLoadingDialog();
        }
    ,'Confirm',['YES','NO']);
}


function saveItem(){

    //openLoadingDialog();

    var error=0;
    var data = {};

    // build payload
    if($('#date').val()!="")
    {
        var dateString = $('#date').val()+' '+$('#time_from').val();
        data.begin = moment(dateString, "DD.MM.YYYY HH:mm:ss").format()
    }

    if(!urlParams.has('active') && $('#time_to').val())
    {
        var dateString = $('#date').val()+' '+$('#time_to').val();
        data.end = moment(dateString, "DD.MM.YYYY HH:mm:ss").format()
    }

    if($('#desc').val() && $('#desc').val().trim()!=="") data.description = $('#desc').val();

    // read values from custom dropdowns (only include when set)
    var projectVal = document.getElementById('projectSelected') ? document.getElementById('projectSelected').getAttribute('data-value') : null;
    if(projectVal && projectVal!=="null") data.project = isNaN(projectVal) ? projectVal : parseInt(projectVal);

    var activityVal = document.getElementById('activitySelected') ? document.getElementById('activitySelected').getAttribute('data-value') : null;
    if(activityVal && activityVal!=="null") data.activity = isNaN(activityVal) ? activityVal : parseInt(activityVal);

    var userVal = document.getElementById('userSelected') ? document.getElementById('userSelected').getAttribute('data-value') : null;
    if(userVal && userVal!=="null") data.user = isNaN(userVal) ? userVal : parseInt(userVal);

    var tagVal = document.getElementById('tagSelected') ? document.getElementById('tagSelected').getAttribute('data-value') : null;
    if(tagVal && tagVal!=="null" && tagVal!=="undefined") {
        // Kimai expects tags as comma separated string — send as string
        data.tags = String(tagVal);
    }

    var api = new API();
    var resp;
    if(typeof(itemId)!=="undefined")
    {
        resp = api.makeAPICall("patch","/api/timesheets/"+itemId, data)
    }
    else
    {
        resp = api.makeAPICall("post","/api/timesheets", data)
    }

    if(typeof(resp) !== 'undefined' && typeof(resp.errors)!=="undefined") error = 1;
    if(debug) console.log('api Send',JSON.stringify(data))
    if(debug) console.log('api Response',JSON.stringify(resp))

    //closeLoadingDialog();

    if(error)
    {
        alert((resp && resp.message ? resp.message : 'Error') + "\n" + JSON.stringify(resp && resp.error ? resp.error : ''));
        setTimeout(function(){
            closeLoadingDialog();
        },250);
    }
    else 
    {
        openLoadingDialog();
        window.location.href='index.html';
    }

}

function renderNewItem(){
    var desc = '';
    if(urlParams.has('description')) desc = decodeURIComponent(urlParams.get('description'));

    $('#desc').val(desc);
    $('#desc').focus();
    $('#date').val(moment().format("DD.MM.YYYY"))
    $('#time_from').val(moment().format("HH:mm:ss"))
    $('#time_to,#time_total').val('');

    renderItemCustomers();
    renderItemProjects();
    renderItemActivities();
    renderItemUsers();
    renderItemTags();

    $('.delete-item').remove();
    $('.save-item .text').text('Start');

    renderUpdateProjectViaCustomer();
    $('#customerSelect').change(function(){
        renderUpdateProjectViaCustomer();
    });

    renderUpdateActivitiesViaProject();
    $('#customerSelect, #projectSelect').change(function(){
        renderUpdateActivitiesViaProject();
    });

    renderCallbacksForSelects();
}

function renderCallbacksForSelects(){
    $('.select2-selection').on('focus',function(){
        //if($('.select2-search__field:visible').length) return false;

        $(this).closest('div').find('select').select2('open');
    });
}

//fix autofocus on open
$(document).on('select2:open', () => {
    let allFound = document.querySelectorAll('.select2-container--open .select2-search__field');
    allFound[allFound.length - 1].focus();
});

$(function(){
    $('select').select2();
});