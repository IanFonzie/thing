// input:
// 	- todos (have)
// output:
// 	- render months
// description:
// 	- so we already have the todos
// 	- we need to render the months of all todos
// 	- have an object to keep track of due_dates
// 	- in order to iterate over the todos:
// 		- if we haven't seen a todo.due_date before (i.e. it's not a property on an object):
// 			- set it as a property on the object and with the {todo} as the first element in the array
// 		- else:
// 			- append it to the property matching the due_date
// 	- ultimately we'll end up with a list of todos_by_date
// rules:
//  	- when do we want to get this list?
// 		- seems like we want it any time that we render the page in order to keep it up to date
// test case:
// 	- a list of todos will be generated and displayed in the nav element
// data structure:
// 	- object with properties, todo object
// Algorithm:
// 	- this.todos.reduce((object, todo) => {
// 		let date = object[todo.due_date];
// 		if (date) {
// 		  date.push(todo);
// 	    } else {
// 	    object[todo.due_date] = [todo];
// 		} 
// 		return object;
// 	}, {})

// Notes:
// 	- is there a way to easily incorporate completed todos?

// input:
// 	- this.todos
// output:
// 	- content for the page
// dscription:
// 	- we get the todos
// 	- add due_dates
// 	- sort them
// 	# current situation
// 	- things that happen but not sure of the order:
// 		- need to get a selection
// 		- provide some selected todos (i.e. the todos for a give month/year combo)
// 		- format the todos selected todos (which basically incomplete and complete todos for a given month/year combo
// 			(which we'll need at some point in the future))
// 		- get all todos and order them by due_date
// 		- get all complete todos_and order them by due_date (very similar except we're using the completed property
// 			in addition to, unless we can provide a different set of arguments)
// rules:
// 	- Clicking on a "todo group" selects it and updates the content on the main area accordingly.
// 		- so when we load the page for the first time selected is just everything
// 		- the next time we render the page it will be different
// 		- what if we had an argument when we call renderPage?
// 		- the argument that we pass in to render the page
// 		- based on the argument that we passed in:
// 			- we set selected by accessing todos or done
// 	- how do we know whether or not to access todos or done?
// 		- when the page loads we know that we're accessing todos
// 		- when we click on one of the links it's a bit more ambiguous, however we can look at the closest section[id]
// 		to know which one we should acces it
// 		- maybe it would be simplest to just pass in the element and extract the data
// 	- How are we currently using renderPage
// 		- anything except Add stays on the same page
// 		- so for all actions except add and page load the sections we can just look at the header > time element before
// 		rendering exc
// 		- for add we can supply an argument of 'All Todos'
// 	- Would passing in an element even help?
// 		- not from the main element
// 		- so how do we know which elements to render if we're already on a list?
// 		- maybe this.selected only changes when we explcitly change it

// 	- example:
// 		- start with all todos
// 		- add some todos (selected will get set to this.todos)
// 		- change to one of the completed 01/14 dates:
// 			- in the click we know that current_section has changed to a date under either completed or all
// 			- so now we know that we should be looking for 01/14 on the done_todos_by_date object
// 			- if we update things on this page we use the same context (done_todos_by_date[01/04])
// 			- if we change to All 03/17 dates:
// 				- we should be looking for 03/17 on the todos_by_date object
// 				- if we add a new object while we're here we know that our context will change (todos)
// 	- when does context change?
// 		- when we explicitly click on a section
// 		- when we add a new todo
// 		- when we load the page
// 	- maybe we could pass in the name of a property on the object when we render the page (context and dateGroup)
// 	those specific circumstances

// first page load:
// 	'todos'
// create:
// 	'todos'
// nav click:
// 	'todos' or 'done' depending on where the click occurred and its <time> element or data-title attribute

// define this.getViewingContext(element, dateGroup) {
// 	const id = element.closest('section[id]').id;
// 	if (/\d{2}\/\d{2}/).test(dateGroup) {
// 		return id === 'all' ? 'todos_by_date' : 'done_todos_by_date';
// 	}
// 	return id === 'all' ? 'todos' : 'done';
// }
// define this.getDateGroup(element) {
// 	return element.closest(dl[data-title]).dataset.title;
// },
// define this.determineSelected(context, dateGroup) {
// 	this.selected = context.endsWith('todos_by_date') ? this[context][dateGroup] : this[context];
// },
// inside renderPage:
// 	- if context and dateGroup were passed in:
// 		- call this.determineSelected(context, dateGroup)
// define this.changeGroupView(element) {
// 	const dateGroup = this.getDateGroup(element);
// 	const context = this.getViewingContext(element);

// 	this.renderPage({context, dateGroup});
// }
// inside this.handleClick():
// 	if (element.closest('dl[data-title]')) {
// 		this.changeGroupView(element);
// 	}


let TodosApp;

(() => {
	function request({method = 'GET', url, dataCallback}) {
		return new Promise((resolve, reject) => {
			let data = null;

			const xhr = new XMLHttpRequest();
			xhr.open(method, url);
			xhr.responseType = 'json';

			if (dataCallback) {
				data = dataCallback(xhr);
			}

			xhr.addEventListener('load', resolve);
			xhr.addEventListener('error', reject);

			xhr.send(data);
		});
	}

	function formDataToObject(formData, stripInvalid) {
    const object = {};
    for (let pair of formData.entries()) {
    	if (stripInvalid && stripInvalid(pair)) {
    		pair[1] = '';
    	}
      object[pair[0]] = pair[1];
    }

    return object;
  }

	TodosApp = {
		getTemplates() {
			this.templates = {};
			
			const handlebarsTemplates = document.querySelectorAll('[type="text/x-handlebars"]');
			for (let i = 0; i < handlebarsTemplates.length; i += 1) {
				let template = handlebarsTemplates[i];
				if (template.dataset.type === 'partial') {
					Handlebars.registerPartial(template.id, template.innerHTML);
				} else {
					this.templates[template.id] = Handlebars.compile(template.innerHTML);
				}
				template.remove();
			}
		},
		getTodos() {
			return request({url: '/api/todos'}).then(({target: xhr}) => {
				return xhr.response;
			});
		},
		addDueDates(todos) {
			// REVALUATE WHETHER THIS IS NECESSARY AFTER ADDING MORE FUNCTIONALITY
			this.todos = todos.map(todo => {
				if (todo.month && todo.year) {
					todo.due_date = `${todo.month}/${todo.year.substring(2)}`;
				} else {
					todo.due_date = 'No Due Date';
				}
				return todo;
			});

			return this.todos;
		},
		sortCollection() {
			this.todos.sort((a, b) => {
				const titleA = a.title.toUpperCase();
				const titleB = b.title.toUpperCase();
			    if (titleA > titleB) {
		        return 1;
			    }
			    if (titleA < titleB) {
		        return -1;
			    }
				return 0;
			});
		},
		setCurrentSection(content) {
			return content['current_section'] = {data: this.todos.length, title: 'All Todos'};
		},
		formattedTodos() {
			return this.todos.filter(todo => !todo.completed).concat(this.todos.filter(todo => todo.completed));
		},
		renderPage({context, dateGroup, refreshTodos = true}) {
			// Is there ever a case where we dont' want due dates? I guess we'll see
			let todos;
			const content = {};

			this.currentlyEditingId = null;

			if (refreshTodos) {
				todos = this.getTodos();
			} else {
				todos = Promise.resolve(this.todos);
			}

			todos
			.then(this.addDueDates.bind(this))
			.then(this.sortCollection.bind(this))
			.then(() => {
				this.setCurrentSection(content);
				content['selected'] = this.formattedTodos();
				document.body.innerHTML = this.templates.main_template(content);
			});
		},
		getTodo(id) {
			return request({url: `/api/todos/${this.currentlyEditingId}`}).then(({target: xhr}) => {
				if (xhr.status === 404) {
					alert(xhr.responseText);
					return;
				}

				return xhr.response;
			});
		},
		renderFormFields(todo) {
			for (let property in todo) {
				let formField = document.querySelector(`#form_modal [name$="${property}"]`);
				if (formField && todo[property]) {
					formField.value = todo[property];
				}
			}
		},
		displayModal(updateId) {
			let preparedModal;

			if (updateId) {
				this.currentlyEditingId = updateId;
				preparedModal = this.getTodo(this.currentlyEditingId)
					.then(this.renderFormFields.bind(this));
			} else {
				preparedModal = Promise.resolve();
			}

			preparedModal.then(() => {
				$('#form_modal').css({top: 200 + window.scrollY});
				$('#modal_layer, #form_modal').stop().fadeIn();
			});
		},
		removeFromCollection(id) {
			this.todos = this.todos.filter(todo => todo.id !== Number(id));
		},
		getTodoElement(element) {
			return element.closest('tr[data-id]');
		},
		deleteTodo(element) {
			const todo = this.getTodoElement(element);
			const id = todo.dataset.id;

			request({url: `/api/todos/${id}`, method: 'DELETE'}).then(({target: xhr}) => {
				if (xhr.status === 404) {
					alert(xhr.responseText);
					return;
				}

				todo.remove();
				this.removeFromCollection(id);
				this.renderPage({refreshTodos: false});
			});
		},
		editTodo(element) {
			const id = this.getTodoElement(element).dataset.id;
			this.displayModal(id);
		},
		hideModal() {
			if (this.currentlyEditingId) {
				this.currentlyEditingId = null;
			}

			$('#modal_layer, #form_modal').stop().fadeOut();
		},
		markTodoComplete(element) {
			let id;
			let data;

			if (element.matches('.list_item')) {
				this.currentlyEditingId = this.getTodoElement(element).dataset.id;
				data = {completed: !(this.todos.find(todo => todo.id === Number(this.currentlyEditingId))).completed};
			} else if (element.matches('button[name="complete"]')) {
				data = {completed: true};
			} else {
				alert('Cannot mark as complete as item has not been created yet!');
				return;
			}

			this.createOrUpdateTodo({
				url: `/api/todos/${this.currentlyEditingId}`,
				method: 'PUT',
				dataCallback(xhr) {
					xhr.setRequestHeader('Content-Type', 'application/json');
					return JSON.stringify(data);
				}
			});
		},
		handleClick(event) {
			const element = event.target;

			// give the conditions better names for legibility
			if (element.parentNode.matches('[for="new_item"]')) {
				this.displayModal();
			} else if (element.closest('.delete') !== null) {
				this.deleteTodo(element);
			} else if (element.matches('main label[for^="item"]')) {
				event.preventDefault()
				this.editTodo(element);
			} else if (element.matches('#modal_layer')) {
				this.hideModal();
			} else if (element.matches('.list_item, button[name="complete"]')) {
				event.preventDefault();
				this.markTodoComplete(element);
			}
		},
		configureCreateOrUpdateRequest(form) {
			let requestArgs;

			if (this.currentlyEditingId) {
				requestArgs = {url: `/api/todos/${this.currentlyEditingId}`, method: 'PUT'};
			} else {
				requestArgs = {url: '/api/todos', method: 'POST'}
			}

			requestArgs['dataCallback'] = function(xhr) {
				xhr.setRequestHeader('Content-Type', 'application/json');

				const formData = new FormData(form);
				const json = JSON.stringify(formDataToObject(formData, input => {
					if (['due_day', 'due_month', 'due_year'].includes(input[0])) {
						input[0] = input[0].replace('due_', '');
						return !/\d+/.test(input[1]);
					}
					return false;
				}));

				return json;
			}

			return requestArgs;
		},
		editCollection(editedTodo) {
			const todo =  this.todos.find(todo => todo.id === Number(this.currentlyEditingId));
			for (let property in editedTodo) {
				todo[property] = editedTodo[property];
			}
		},
		addToCollection(todo) {
			this.todos.push(todo);
		},
		createOrUpdateTodo(args) {
			request(args).then(({target: xhr}) => {
				if (xhr.status === 400 || xhr.status === 404) {
					alert(xhr.statusText);
					return;
				}

				if (this.currentlyEditingId) {
					this.editCollection(xhr.response);
				} else {
					this.addToCollection(xhr.response);
				}

				this.renderPage({refreshTodos: false});
			});
		},
		handleSubmit(event) {
			event.preventDefault();

			const form = event.target;
			const requestArgs = this.configureCreateOrUpdateRequest(form);
			this.createOrUpdateTodo(requestArgs);
		},
		bindEvents() {
			document.body.addEventListener('click', this.handleClick.bind(this));
			document.body.addEventListener('submit', this.handleSubmit.bind(this));
		},
		init() {
			this.getTemplates();
			this.renderPage({});
			this.bindEvents();
		}
	};
})();

document.addEventListener('DOMContentLoaded', TodosApp.init.bind(TodosApp));