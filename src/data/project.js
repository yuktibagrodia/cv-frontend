/* eslint-disable guard-for-in */
/* eslint-disable no-bitwise */
/* eslint-disable import/no-cycle */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-alert */
import isElectron from 'is-electron';
import { resetScopeList, scopeList, newCircuit } from '../circuit';
import { showMessage, showError } from '../utils';
import { checkIfBackup } from './backupCircuit';
import { generateSaveData, generateImage } from './save';
import load from './load';

/**
 * Helper function to recover unsaved data
 * @category data
 */
export function recoverProject() {
    if (localStorage.getItem('recover')) {
        const data = JSON.parse(localStorage.getItem('recover'));
        if (confirm(`Would you like to recover: ${data.name}`)) {
            load(data);
        }
        localStorage.removeItem('recover');
    } else {
        showError('No recover project found');
    }
}


/**
 * Prompt to restore from localStorage
 * @category data
 */
export function openOffline() {
    if (isElectron()) {
        window.ipcRenderer.send("open")
        window.ipcRenderer.on("setLogix", (e, dir) => {
            console.log(dir);
            logix_project_id = dir;
        })
        window.ipcRenderer.on("loadData", (e,loadData) => {
            console.log(loadData)
            load(JSON.parse(loadData));
        })

    }
    else {
        $('#openProjectDialog').empty();
        const projectList = JSON.parse(localStorage.getItem('projectList'));
        let flag = true;
        for (id in projectList) {
            flag = false;
            $('#openProjectDialog').append(`<label class="option"><input type="radio" name="projectId" value="${id}" />${projectList[id]}<i class="fa fa-times deleteOfflineProject" onclick="deleteOfflineProject('${id}')"></i></label>`);
        }
        if (flag) $('#openProjectDialog').append('<p>Looks like no circuit has been saved yet. Create a new one and save it!</p>');
        $('#openProjectDialog').dialog({
            width: 'auto',
            buttons: !flag ? [{
                text: 'Open Project',
                click() {
                    if (!$('input[name=projectId]:checked').val()) return;
                    load(JSON.parse(localStorage.getItem($('input[name=projectId]:checked').val())));
                    $(this).dialog('close');
                },
            }] : [],

        });
    }
}
/**
 * Flag for project saved or not
 * @type {boolean}
 * @category data
 */
let projectSaved = true;
export function projectSavedSet(param) {
    projectSaved = param;
}


/**
 * Helper function to store to localStorage -- needs to be deprecated/removed
 * @category data
 */
export function saveOffline() {
    const data = generateSaveData();
    if (isElectron()) {
        if (logix_project_id === 0) {
            // make a new file and save
            listenToSimulator = false;
            window.ipcRenderer.send("save", {
                name: projectName,
                data: data,
            })
            window.ipcRenderer.on("setLogix", (e, dir) => {
                console.log(dir);
                logix_project_id = dir;
            })
        }
        else {
            // we have a current file and we save changes in it
            window.ipcRenderer.send("overwrite", {
                dir: logix_project_id,
                data: data,
            })
        }
        window.ipcRenderer.on("message", (e, message) => {
            showMessage(message)
            $('.loadingIcon').fadeOut();
            listenToSimulator = true;
        })

    }
    else {
        localStorage.setItem(projectId, data);
        const temp = JSON.parse(localStorage.getItem('projectList')) || {};
        temp[projectId] = projectName;
        localStorage.setItem('projectList', JSON.stringify(temp));
        showMessage(`We have saved your project: ${projectName} in your browser's localStorage`);
    }
}

/**
 * Checks if any circuit has unsaved data
 * @category data
 */
function checkToSave() {
    let saveFlag = false;
    // eslint-disable-next-line no-restricted-syntax
    for (id in scopeList) {
        saveFlag |= checkIfBackup(scopeList[id]);
    }
    return saveFlag;
}

/**
 * Prompt user to save data if unsaved
 * @category data
 */
window.onbeforeunload = function () {
    if (isElectron()) {
        // because alert are not supported so temp code until modals are here
        return;
    }
    if (projectSaved || embed) return;

    if (!checkToSave()) return;

    window.alert('You have unsaved changes on this page. Do you want to leave this page and discard your changes or stay on this page?');
    const data = generateSaveData('');
    localStorage.setItem('recover', data);
    // eslint-disable-next-line consistent-return
    return 'Are u sure u want to leave? Any unsaved changes may not be recoverable';
};


/**
 * Function to clear project
 * @category data
 */
export function clearProject() {
    if (confirm('Would you like to clear the project?')) {
        globalScope = undefined;
        resetScopeList();
        $('.circuits').remove();
        newCircuit('main');
        showMessage('Your project is as good as new!');
    }
}

/**
 Function used to start a new project while prompting confirmation from the user
 * @param {boolean} verify - flag to verify a new project
 * @category data
 */
export function newProject(verify) {
    if (verify || projectSaved || !checkToSave() || confirm('What you like to start a new project? Any unsaved changes will be lost.')) {
        clearProject();
        localStorage.removeItem('recover');
        if (isElectron()){
            logix_project_id = 0;
        }
        else{
            window.location = '/simulator';
        }

        projectName = undefined;
        projectId = generateId();
        showMessage('New Project has been created!');
    }
}
