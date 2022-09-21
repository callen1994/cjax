# CJAX - Continuuously Joined Action Exchange

Well actually it's just my initials followed by an X haha

This library is inspired by my experience with [rxjs](https://rxjs.dev/)

I used rxjs to manage state in a dashboard app which handled a lot of interactive data locally. I was able to do a lot with rxjs, but the package felt a bit over-engineered for my purposes. So I decided to do some more engineering to come up with a new solution

## The essence of it - Service / Emitter

I don't really believe in using the class keyword in javascript, but you can think of a Service as a class (I implemented it as a closure).

This is essentially a cell of data in your app, similar to a zustand store

A service is a cell of data that you're allowed to make updates to

An emitter is a cell of data that you shouldn't make updates to directly

the store has the following methods:

- current() => gets the current value of the store
- listen( listener ) => adds a listener to the service which will be called whenever an update happens
- update( newVal | (oldVal) => newVal ) => updates the cellular state to either the value passed (or if the value passed is a function)
- pipe( reducerFunction ) => creates an emitter. Every time\* the original service emits. The emitter calls the reducer function on the emitted value and emits the result.

* a piped emitter doesn't actually emit every time the original emits. if the reducer function returns undefined the piped emitter will ignore that update. This was a convenient way for me to filter certain events within a pipe. If the absence of data is an important value to handle from that pipe, the reducer should return null.

## Using it

The major difference between this state management system and other popular libraries is support for creating ad-hoc cells to manage the state of a component and it's children.

Let's assume some CJAX Services declared like this

```
  SELECTED_USER  = CJAXService<string>('user1')
  ALL_DATA  = CJAXService<{name: string, job: string}[]>({
    user1: { name: 'abc', job: 'developer' },
    user2: { name: 'xyz', job: 'designer' },
  })
```

Here's some basic usage

```
  function UserSelector() {

    const selected = useCJAX(SELECTED_USER); // If you just need to access the value of the service, you can unwrap it like this

    // usePipe Ad-hoc creates an emitter which can be consumed by this component (or it's children);
    const userIdsPipe = usePipe(
      () => ALL_DATA.pipe(users => Object.keys(users) ) // If you want to reduce the service you pass a function which calls pipe to reduce it, and returns the emitter of the piped data
    );

    const userIds = useCJAX(userIdsPipe)

    return (
      <div>
        { users.map(userName => {
          <div
            key={userName}
            onClick={() => SELECTED_USER.update(userName)}
            style={{ backgroundColor: userName === selected ? "yellow" : "white" }}>
            {userName}
          </div>
        }) }
      </div>
    )
  }
```

More Complicated usage - that isn't as optimized as it could be.

```
  function UserDetail() {

    const selected = useCJAX(SELECTED_USER);

    const userPipe = usePipeHere(
      () => ALL_DATA.pipe(users => users[selected] ), // If you want to reduce the service you pass a function which constructs that pipe.
      [selected] // If there were any dependencies that should be accounted for in that pipe, they can be passed here (the dependencies is an optional parameter though and defaults to [])
    );

    const user= useCJAX(userPipe)

    return (
      <div>
        <div>Name: {user.name}</div>
        <div>Job: {user.job}</div>
      </div>
    )
  }
```

The above sample works, but it's sub-optimal. The component cares about the SELECTED_USER state and the ALL_DATA state, and it needs to do some logic once it has both of those pieces of data. As written above, this works, but the component recieves data from selected, which triggers a re-render. That during that re-render a change to "selected" is picked up by the dependencies array on the ALL_DATA pipe. That pipe is re-built and returns a value, which updates the state, causing a re-render.
The performance issue is that any update to selected will cause two renders.
From a code-clarity standpoint this is also... kinda messy. The selected value is getting communicated to the user-reducer through the react render/dependency method. this is implicit, difficult to read, and often has weird unexpected behaviors (like extra renders)

The code below shows how a function can respond to multiple data cells (CJAX Services) using the cjaxJoin() function

```
  function UserDetail() {

    const dataImReactingToPipe = usePipe(
      // Here use-pipe is taking a function which constructs an emitter using the cjaxJoin functionality.
      () =>
        cjaxJoin(ALL_DATA, SELECTED_USER).pipe(
          // This code will run any time either ALL_DATA or SELECTED_USER emit a new value
          ([users, selected]) => {
            if (!users  || !selected) return; // because cjaxJoin creates a new service which needs to wait for both services to provide a value, these could be undefined. There's a lot of potential undefinded states in cjax, but it's a tradeoff I've been willing to make.

            const user = users[selected];

            // This is a pattern that has worked for me. Slice the data and return an object wich the component can respond to.
            return { user, selected };
          })
    );  // No dependencies are needed in this pipe so that argument can be omitted

    const dataImReactingTo = useCJAX(dataImReactingToPipe);

    if (!dataImReactingTo) return <div>loading...</div>

    const { user, selected } = dataImReactingTo;

    return (
      <div>
        <div>Name: {user.name}</div>
        <div>Job:
          <input
            // I can set the value and onChange properties to interact directly with the ALL_DATA service instead of creating some intermediary state
            value={user.job}
            onChange={(e) => ALL_DATA.update(users => {
              // This may look ugly if you've gotten used to avoiding data-mutation at all costs, but mutating within an updator means that all the listeners will know to update their values when this happens
              // If you're worried about pass-by-reference bugs, read on in the next section where I explain my change detection magic
              users[selected].job = e.target.value;
              return users;
            })}
          />
        </div>
      </div>
    )
  }
```

## Change Detection

Keen eyed readers would have seen the in-place mutation being done on the onChange of the input element. This will often result in nasty pass-by-reference bugs when consuming the data. Below you can see the useCJAX implementation with some comments explaining how I use deepEqual and cloneDeep to avoid pass-by-reference bugs. useCJAX is the hook which ultimately ties a CJAX Service (or emitter) into the state of a component. This hook is used in the usePipeHere implementation

```

export function useCJAX<T>(serv: Emitter<T>): T {
  const getData = useMemo(() => {

    const cachedValue = serv.current();

    return () => {
      const newValue = serv.current()

      // If these are equivalent, then this getter will return the cached value. Because the cached value here will be === equal to the previous value the react state-setter (being implicitly called in the useSyncExternalStore) won't trigger a re-render
      if (deepEqual(cachedValue, newValue)) {
        return cachedValue
      } else {
        // If the new value is not equivalent to the cached value. I'll update the cache to be a deep clone of the new object
        cachedValue = cloneDeep(newValue);
        // Because clone deep guarantees that a new object was constructed, the react state setter (implied in the useSyncExternalStore) will definitely re-render
        return cachedValue
      }

    };
  }, [serv]);

  // I'm using this new fancy react-18 hook because this hook was specifically designed for this purpose.
  return useSyncExternalStore(serv.listen, getData);
}

```

If you're unfamiliar with useSyncExternalStore Here is an implementation using useState and useEffect that is almost identical (although I'm sure there are nuances that make useSyncExternalStore more correct)

```
  const [state, setState] = useState(serv.current());

  useEffect(
    // Listen returns the unsubscriber so useEffect can clean this up
    () => serv.listen(() => {
      setState(serv.current())
    }),
    [serv]
  )
```

## Known issues

I rely pretty heavily on the assumption that the state being stored in the Service is either a primitive value, or some tree of nested objects / arrays where all the leaves are primitive values. I don't have a use case for storing functions or classes inside the cellular state. I wish I had a way to make this explicit through the type system, but that's more work than I want to put into it right.
