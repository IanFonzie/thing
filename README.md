curl -H "Content-Type: application/json" -X POST -d '{"title":"dog", "year":"year"}' http://localhost:3000/api/todos

# PAGE LOAD

- input:
	- page load
- output:
	- all todos are rendered
- description:
	- when DOMContentLoaded fires:
		- FUNCTION (get the templates):
			- get a reference to all of the template elements
			- iterate over them
			- remove the template and store a reference to it
			- if the element has an attribute of data-type="partial":
				- call register the template element as a partial using the element's id and innerHTML properties
			- else:
				- assign the result of compiling a template to a property on an object whose key is the template element's id
			- we'll have an object containing compiled templates, partials will be registered and all templates will have
			been removed from the DOM
		- FUNCTION (render the page):
			- need to call the appropriate template with the correct object
			- to reach milestone one, we need to at least be able to render todos to the page
			- there appears to be a selected property which I'm assuing is a list of selected todos because it renders them
			using an item_partial template
			- the item template partial is mostly composed of todo properties except for the due_date field which seems to be
			the month joined to the last two digits of the year by a backslash
			- we need to call renderPage with All the todos with a duedate property attached to begin rendering
- Rules:
		- FUNCTION (Due date):
			- using a todo object, we can add a due_date property to it by checking to see if month has a value and year has
			a value for the given todo
			- if it both values exist:
				- set due_date to `${month}/{year.substring(1)}`
			- else:
				- set due_date to "No Due Date"
- Test Cases:
	- All todos are rendered alphabetically
- Data Structure:
	- Array of objects, XMLHttpRequest, Promises
- Algorithm:
	- define a request function({method = 'GET', url, dataCallback}):
		- return a Promise that:
			- lets data = null;
			- instantiates an XHR
			- opens a request using method to url
			- set the request's responseType to 'json'
			- if dataCallback has been supplied then we call it and store the result of the callback in data
			- add an event listener that listens for 'load' events to the request and pass resolve
			- add an event listener that listens for 'error' events to the request and pass reject
			- send the request using the data

		- declare a TodosApp object:
			- define a getTemplates method:
				- set templates to an empty object
				- set handlebarsTemplates to document.querySelectorAll('[type="text/x-handlebars]')
				- iterate over handlebarsTemplates:
					- remove the current handlebarsTemplate and store it as template
					if (template.getAttribute('data-type') === 'partial'):
						- call Handlebars.registerPartial(template.id, template.innerHTML)
					else: 
						- set templates[template.id] = Handlebars.compile(template.innerHTML)
			- define a this.getTodos method:
				request({url: '/api/todos'}).then(({target: xhr}) => {
					this.todos = xhr.response;
				});
			- define an setDueDates() method:
				- this.todos.forEach(todo => {
					if (todo.month and todo.year are set):
						todo.due_date = `${month}/${year.substring(1)}`
					else:
						todo.due_date = 'No Due Date'
				})
			- define a this.renderPage method:
				- call this.getTodos();
				- call this.addDueDates();
				- call this.main_content({selected: this.todos})

# DISPLAY MODAL FOR ADDING: 

- input:
	- You can click on "+ Add new to do"
- output:
	- bring up the modal to create a new todo
- description:
	- Doesn't sound like we're actually doing anything with the modal
	- so we need a click event
	- will this content event change, look slike it does
	- so we need to either add event listeners every time we render the page or use delegation on the body
	- I think delegation might be easier
	- the img and heading can both should both respond to this event and those are contained by label for="new_item"
	- we can attach the actual handler to the body object
	- if event.target.parentNode.matches('[for="new_item]') {
		we want to fade the modal in
	}
- rules:
	- define a this.displayModal() method:
		- we want to fade the modal_layer and form_modal in using jQuery
	FUNCTION (handle clicks):
		- define a handleClicks method on the TodosApp:
			- if event.target.parentNode.matches('[for="new_item]') {
				call this.displayModal();
			}
- test cases:
	- modal is displayed and overlay are displayed
- data structure:
	- Node properties, CSS selectors, matching, jQuery animations
- Algorithm:
	- on TodosApp:
		- define a this.displayModal() method:
			- $('#modal_layer, #form_modal').fadeIn();
		- define a this.handleClick({target: element}) method:
			- if (element.parentNode.matches('[for="new_item]')) {
				call this.displayModal();
			}
		- define a this.bindEvents method:
			- call document.body.addEventListener('click', this.handleClick.bind(this));
		- inside init():
			- call this.bindEvents()
- Modifications:
	- need to incorporate the scrollY/Top property

# DELETING A TODO

- input:
	- click on the trashcan
- output:
	- delete the todo
- description:
	- if the element's closest .delete exists:
	 	- call the API to delete the todo
- rules:
	- FUNCTION (deleteTodo(todo))
		- need to get the closest('tr[data-id]').getAttribute('data-id');
		- request({url: `/api/todos/${id}`, method: "DELETE"}) which will have a status code that we can inspect
		- if the request was successful:
			- remove the node the from the DOM
			- remove the element from this.todos
- test cases:
	- the node is removed from the DOM, the main_content is rendered again and this.todos no longer has todos
	- else: we can alert?
- Data Structure:
	- Promise, data attributes, this.todos collection, Node methods
- Algorithm:
	- On TodosApp:
		- define this.removeFromCollection(id) method:
			- this.todos.filter(todo => todo.id !== id);
		- define this.deleteTodo(todoElement) method:
			- set id to todoElement.closest('tr[data-id]').getAttribute('data-id')
			- call request({url: `/api/todos/${id}`, method: "DELETE"})
			- when the request completes:
				- if xhr.status === 204:
					- call todoElement.remove()
					- call this.removeFromCollection(id)
					- call this.renderPage(false)
		- add an else if condition that checks if element.closest('.delete') !== null:
			- call this.deleteTodo(element);

# NUMBER ON TOP RIGHT REFLECTING TOTAL TODOS (FIRST REVISION)

- input:
	- something changes
- output:
	- the number on the top right changes
- description:
	- when we render the template we need to provide a current section object, which has a data and title value
	- current section implies that it's something that we're currently viewing
- rules:
	- how do we know which section we're viewing?
		- when the App first loads we know that it will be all of the todos
		- this changes when we select a different group
		- the wording seems to imply that it should reflect that at this point in time we can just use
		the list that we're currently pulling
		- define this.setCurrentSection(content):
			- return {data: this.todos.length, title: 'All Todos'}
		- in this.renderPage():
			- set content to {}
			- call this.setCurrentSection() when this.todos is available (depending on whether or not we need to
				refresh)
			- pass content to this.templates.main_content()
	- The total of all todos is displayed along with the title "All Todos"
- Data Structure:
	- nested object, new method
- Algorithm:
	- define this.setCurrentSection():
		- return {data: this.todos.length, title: 'All Todos'};
	- inside this.renderPage();
		- declare an empty content object {};
			- both inside and outside of the Promise:
				- this.setCurrentSection(content);
				-	set the content's selected value to this.todos
				- call this.templates.main_content() with content

# CREATE TODO AND APPEND TO LIST

- input:
	- adding a todo
- output:
	- todo is created and added to the list if we submit it
	- cancelled if we click outside the modal
- description:
	problem 1:
		- so we have a modal displayed that has a form
		- we need a way to associate the modal with an object
		- there's nothing on the modal that can associate with a given todo
		- maybe we can set a state when displaying the modal and remove it again once it's hidden
	problem 2:
		- we can listen for submit events on the body object
		- when a submit event occurs:
			- get a reference to the form using event.target
			# FUNCTION (configureCreateOrUpdateRequest)
				if this.currentlyEditingId:
					requestArgs = {url: `/api/contacts/${this.currentlyEditingId}`, method: 'PUT'};
				else:
					requestArgs = {url: '/api/contacts', method: 'POST'}

				requestArgs['dataCallback'] = function() {
					const formData = new FormData(form);
					const json = JSON.stringify(formDataToObject(formData));
					return json;
				}
			- call request with requestArgs
			- if the xhr.status is 400:
				- alert(xhr.statusText);
				- return;
			- then(({target: xhr}) => {
				add the element to the collection
				sort the collection
				render the page
			})
- rules:
	- serialize array to JSON:
		- define a formDataToObject function:
			- declare an empty object
			- iterate over the pair of formData.entries()
			- assign pair[0] as the key and pair[1] as the value
			- return the object
		- pass the form into the FormData constructor
		- pass the resulting ormData to formDataToObject() and call JSON.stringify on it
		- return the json
- Test Cases:
	- element is added to the collection, collection is sorted and the DOM is updated to reflect that
- Data Structure:
	- new currentlyEditingId state, objects, JSON.stringify, callbacks
- Algorithm:
	- on the TodosApp:
		- define this.configureCreateOrUpdateRequest(form) method:
			if this.updateId:
					requestArgs = {url: `/api/contacts/${this.currentlyEditingId}`, method: 'PUT'};
				else:
					requestArgs = {url: '/api/contacts', method: 'POST'}

			requestArgs['dataCallback'] = function() {
				const formData = new FormData(form);
				const json = JSON.stringify(formDataToObject(formData));
				return json;
			}

			return requestArgs;
		- define a this.addToCollection(todo) method:
			- this.todos.push(todo);
		- define a this.sortCollection() method:
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
			})
		- define a this.createOrUpdateTodo(requestArgs) method:
			- call request(requestArgs).then(({target: xhr}) => {
				- if the xhr.status is 400:
					- alert(xhr.statusText);
					- return;
				- call this.addToCollection(xhr.response)
				- call this.sortCollection;
				- render the page
			});
		- define a this.handleSubmit({target: form}) method:
			- set requestArgs to this.configureCreateOrUpdateRequest()
			- call this.createOrUpdateTodo(requestArgs)
			- call request(requestArgs).then(({target: xhr}))
		- in the this.bindEvents method():
			- call document.body.addEventListener('submit', this.handleSubmit.bind(this));
- Notes:
	- Need to modify the formDataToObject function so that it will skip 

# UPDATING_TODOS:

- input:
	- click on a todo's text & save the todo
- output:
	- todo is saved with new data
- details:
	- as mentioned in the previous assignment, we need a way to associate the modal with a todo
	- I was thinking of setting a state when the modal has been brought up by clicking on a todo's text
	- inside this.displayModal():
		- if an id has been passed in, we set the currentlyEditingId to id
	- define this.editTodo(element):
		- set id to this.getTodoElement(element).dataset.id
		- call this.displayModal(id);
	- inside this.handleClick:
	 	- if we click on a type="checkbox" in the main content:
	 		- call this.editTodo(element)
- rules:
 	- With the current design, when the user submits the modal, the application should handle the update assuming
 	we add in a check to this.createOrUpdateTodo()
		- this check will see if this.currentlyEditingId is set and if it is, call this.editCollection instead of
		adding to the collection
		- this.editCollection(todo):
			- need to find the matching element in the collection and replace its properties with the properties
			provided
			- can do this by iterating over the object (for let property in object) {
				collectionTodo[property] = object[property];
			}
	- Need to remove state when hiding the modal or rendering the page
- Test Case:
	- DOM and collection are updated
- Data Structure:
	- this.currentlyEditingId, for...in, data attributes
- Algorithm:
	- inside this.displayModal():
		- if an updateId is passed in, set this.currentlyEditingId to updateId
	- define this.editTodo(element):
		- set id to this.getTodoElement(element).dataset.id
		- call this.displayModal(id);
	- in this.handleClick():
		- if the element.matches('main [type="checkbox"]'):
			- call this.editTodo(element)

	- define this.editCollection(editedTodo):
		- set todo to this.todos.find(todo => todo.id === this.currentlyEditingId);
		- for (let property in editedTodo) {
			todo[property] = editedTodo[property];
		}
	- inside this.createOrUpdateTodo():
		- call this.editCollection()
	- inside renderPage set this.currentlyEditingId to null;

- input:
	- an identifier
- output:
	- render a todo's properties to the modal fields
- we could make a promise chain that covers:
	- getting the todo, rendering the fields and displaying the modal
	- or just displaying the modal depending on what we're doing
- rules:
	- getting the todo:
		- we already have access to the todos collection
		- is it easier to find it that way to to use the end point?
		- to get the endpoint we'd need to make a request({url: '/api/todos/this.currentlyEditingId}')
		.then(this.renderFormFields)
		.then(displayModal methods)
	- rendering form fields:
		- we have a JSON object we can look at their keys for (let property in todo) {
			let formField = document.querySelector(`#form_modal [name$=${property}]"`);
			if formField:
				formField.value = todo[property]
		}
- Test Cases:
	- fields are rendered
- Data Structure:
	- Promise chain, form fields, todo object
- Algorithm:
	- on TodosApp:
		- define a getTodo(id) method:
			- return request({url: `/api/todos/${this.currentlyEditingId}`}).then(({target: xhr}) => {
				if (xhr.status === 404) {
					alert(xhr.responseText);
					return;
				}

				return xhr.response;
			})
		- define this.renderFormFields({title, day: due_day, month: due_month, year: due_year, description})


		- inside displayModal():
			- call this.getTodo(id).then(todo => {
				this.renderFormFields(todo);
			}) assign this to preparedModal

			call preparedModal.then(() => {
				modal methods
			})


# MARKING A TODO COMPLETE:

- input:
	- click mark as complete or the todo's li
- output:
	- todo is marked as complete
- description:
	- when we click on a todo's .list_item or button[name="complete"]:
		- prevent the default event from happening
		- we want to mark the todo complete but how we do it will depend on where we invoke the method
		- if we're marking it complete from the form we need to use this.currentlyEditingId and if not we
		need to use the dataset.id of the todoElement
		- since we should only be listening for click events maybe we should pass in the element
		
- rules:
	- determining id and completed value:
		- if the element is the .list_item then we'll get it's todoElement's dataset.id
			- data = {completed: !this.todos.find(todo => todo.id === Number(id)).completed}
		- else if the element is a button and this.currentlyEditingId
			- use this.currentlyEditingId
			- data = {completed: true}
		- else:
			- alert('Cannot mark as complete as item has not been created yet!');
			- return;

		request({url: "/api/todos/${id}", method: 'PUT', dataCallback: function(xhr) {
			xhr.setRequestHeader('Content-Type', 'application/json');
			return JSON.stringify(data)
		}})
- Test Cases:
	- clicking on a .list_item will send a request to mark it complete if it's incomplete and incomplete
	if it's complete
	- clicking mark todo complete in the modal will always mark the todo complete; must be editing otherwise it will alert
- Data Structure:
	- event, todos collection, currentlyEditingId state, request data
- Algorithm:
	- on TodosApp:
		- define this.markTodoComplete(element):
			- if (element.matches('.list_item')):
				- set id to this.getTodoElement(element).dataset.id
				- set data to {completed: !(this.todos.find(todo => todo.id === Number(id)).completed}
			- else if (element.matches('button[name="complete"]')):
				- set id to this.currentlyEditingId
				- set data to {completed: true}
			- else:
				- alert('Cannot mark as complete as item has not been created yet!');
				- return;

			request({url: "/api/todos/${id}", method: 'PUT', dataCallback: function(xhr) {
				xhr.setRequestHeader('Content-Type', 'application/json');
				return JSON.stringify(data)
			}}).then(todo => {
				if (xhr.status === 400 || xhr.status === 404) {
					alert(xhr.statusText);
					return;
				}

				this.editCollection(todo);
				this.renderPage(false)
			});
		- inside handleClick:
			- if element.matches('.list_item, button[name="complete"]'):
				- call event.preventDefault()
				- call this.markTodoComplete(element);

# COMPLETED TODOS APPEAR AT BOTTOM:

- input:
	- list of selected todos
- output:
	- list of selected todos with completed todos at the bottom
- description:
	- right now we're sorting the list the entire list
	- we're passing in the selected object so the template so moving the elements
	will need to occur before we render the page
	- maybe it's as simple as passing in this.todos.select(todo => todo.completed) + this.todos.select(!todo.completed)
- test cases:
	- uncompleted todos will appear at the top of the page sorted alphabetically
	- completed todos will appear at the bottom of the page sorted alphabetically
- data structure:
	- arrays of objects
- Algorithm:
	- on TodosApp:
		- define a this.formattedTodos method:
			- select all of the incomplete todos from the sorted this.todos and concatenate it with a selection of all of 
			the complete todos from this.todos
		- inside renderPage:
			- set content.selected to this.formattedTodos()
		- define a this.formattedTodos() method

# NAV THOUGHTS

- input:
	- todos (have)
- output:
	- render months
- description:
	- so we already have the todos
	- we need to render the months of all todos
	- have an object to keep track of due_dates
	- in order to iterate over the todos:
		- if we haven't seen a todo.due_date before (i.e. it's not a property on an object):
			- set it as a property on the object and with the {todo} as the first element in the array
		- else:
			- append it to the property matching the due_date
	- ultimately we'll end up with a list of todos_by_date
- rules:
 	- when do we want to get this list?
		- seems like we want it any time that we render the page in order to keep it up to date
- test case:
	- a list of todos will be generated and displayed in the nav element
- data structure:
	- object with properties, todo object
- Algorithm:
	- this.todos.reduce((object, todo) => {
		let date = object[todo.due_date];
		if (date) {
		  date.push(todo);
	    } else {
	    object[todo.due_date] = [todo];
		} 
		return object;
	}, {})

- Notes:
	- is there a way to easily incorporate completed todos?

- input:
	- this.todos
- output:
	- content for the page
- description:
	- we get the todos
	- add due_dates
	- sort them
	# current situation
	- things that happen but not sure of the order:
		- need to get a selection
		- provide some selected todos (i.e. the todos for a give month/year combo)
		- format the todos selected todos (which basically incomplete and complete todos for a given month/year combo
			(which we'll need at some point in the future))
		- get all todos and order them by due_date
		- get all complete todos_and order them by due_date (very similar except we're using the completed property
			in addition to, unless we can provide a different set of arguments)
- rules:
	- Clicking on a "todo group" selects it and updates the content on the main area accordingly.
		- so when we load the page for the first time selected is just everything
		- the next time we render the page it will be different
		- what if we had an argument when we call renderPage?
		- the argument that we pass in to render the page
		- based on the argument that we passed in:
			- we set selected by accessing todos or done
	- how do we know whether or not to access todos or done?
		- when the page loads we know that we're accessing todos
		- when we click on one of the links it's a bit more ambiguous, however we can look at the closest section[id]
		to know which one we should acces it
		- maybe it would be simplest to just pass in the element and extract the data
	- How are we currently using renderPage
		- anything except Add stays on the same page
		- so for all actions except add and page load the sections we can just look at the header > time element before
		rendering exc
		- for add we can supply an argument of 'All Todos'
	- Would passing in an element even help?
		- not from the main element
		- so how do we know which elements to render if we're already on a list?
		- maybe this.selected only changes when we explcitly change it

	- example:
		- start with all todos
		- add some todos (selected will get set to this.todos)
		- change to one of the completed 01/14 dates:
			- in the click we know that current_section has changed to a date under either completed or all
			- so now we know that we should be looking for 01/14 on the done_todos_by_date object
			- if we update things on this page we use the same context (done_todos_by_date[01/04])
			- if we change to All 03/17 dates:
				- we should be looking for 03/17 on the todos_by_date object
				- if we add a new object while we're here we know that our context will change (todos)
	- when does context change?
		- when we explicitly click on a section
		- when we add a new todo
		- when we load the page
	- maybe we could pass in the name of a property on the object when we render the page (context and dateGroup)
	those specific circumstances

- first page load:
	- 'todos'
- create:
	- 'todos'
- nav click:
	- 'todos' or 'done' depending on where the click occurred and its <time> element or data-title attribute

- define this.getViewingContext(element, dateGroup) {
	const id = element.closest('section[id]').id;
	if (/\d{2}\/\d{2}/).test(dateGroup) {
		return id === 'all' ? 'todos_by_date' : 'done_todos_by_date';
	}
	return id === 'all' ? 'todos' : 'done';
}
- define this.getDateGroup(element) {
	return element.closest(dl[data-title]).dataset.title;
},
- define this.determineSelected(context, dateGroup) {
	this.selected = context.endsWith('todos_by_date') ? this[context][dateGroup] : this[context];
},
- inside renderPage:
	- if context and dateGroup were passed in:
		- call this.determineSelected(context, dateGroup)
- define this.changeGroupView(element) {
	const dateGroup = this.getDateGroup(element);
	const context = this.getViewingContext(element);

	this.renderPage({context, dateGroup});
}
- inside this.handleClick():
	if (element.closest('dl[data-title]')) {
		this.changeGroupView(element);
	}

- use the context we passed in OR the lastContext so if it's undefined we use

- if context we set lastContext:
	- this.lastContext

- currentContext = context || this.lastContext

- when we call the two methods with the currentContext object

- algorithm:
	- in this.renderPage:
		if context we set lastContext:
		- this.lastContext

	- use the context or the passed in context
	- currentContext = context || this.lastContext

	- call these with currentContext
	  	- this.setSelected(context, dateGroup);
		- this.setCurrentSection(dateGroup);

- where ever we want the context to change we need to pass in a context Object 
{context: {viewSet: 'data_structure_name', dateGroup: 'Title'}}

- first page load:
	{viewset: 'todos', dateGroup: 'title'}
- create:
	{viewset: 'todos', dateGroup: 'All Todos'}
- nav click:
	'todos' or 'done' depending on where the click occurred and its <time> element or data-title attribute

- there is no dateGroup left when we re-render so we try to submit and before the html can be sent the error occurs
