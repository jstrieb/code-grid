export let functions = $state({});

functions.print = (...args) => {
  console.log(...args);
  return 400;
};
