const adjectives = [
  'Silent', 'Curious', 'Bold', 'Swift', 'Calm', 'Bright', 'Sharp', 'Wise',
  'Eager', 'Clever', 'Nimble', 'Vivid', 'Steady', 'Keen', 'Agile', 'Brave',
  'Quiet', 'Fierce', 'Gentle', 'Noble', 'Loyal', 'Daring', 'Fearless', 'Cunning', 
  'Patient', 'Alert', 'Watchful', 'Focused', 'Resilient', 'Sturdy', 'Hardy', 
  'Tenacious', 'Spirited', 'Radiant', 'Lively', 'Subtle', 'Thoughtful', 
  'Insightful', 'Resourceful', 'Adaptable', 'Balanced', 'Grounded', 'Serene', 
  'Tranquil', 'Resolute', 'Determined', 'Fleet', 'Rapid', 'Precise', 'Astute', 
  'Shrewd', 'Perceptive', 'Intrepid', 'Gallant', 'Valiant', 'Vigilant'
];
const animals = [
  'Falcon', 'Panda', 'Otter', 'Lynx', 'Raven', 'Cobra', 'Tiger', 'Eagle',
  'Wolf', 'Bear', 'Fox', 'Hawk', 'Owl', 'Lion', 'Deer', 'Crane', 
  'Panther', 'Jaguar', 'Leopard', 'Cougar', 'Cheetah', 'Hyena', 'Jackal', 
  'Coyote', 'Bison', 'Buffalo', 'Moose', 'Elk', 'Antelope', 'Gazelle', 
  'Ibex', 'Yak', 'Badger', 'Wolverine', 'Weasel', 'Ferret', 'Mink', 
  'Sable', 'Marten', 'Hedgehog', 'Porcupine', 'Armadillo', 'Sloth', 
  'Tapir', 'Capybara', 'Wombat', 'Koala', 'Kangaroo', 'Wallaby', 
  'Dingo', 'Caracal', 'Serval', 'Ocelot', 'Bobcat', 'Wildcat', 'Aardwolf', 
  'Dhole', 'Civet', 'Genet', 'Meerkat', 'Mongoose', 'Kestrel', 'Vulture', 
  'Condor', 'Albatross', 'Heron', 'Pelican', 'Stork', 'Ibis', 'Kingfisher', 'Osprey',
  'Harrier', 'Kite', 'Falconet', 'Sparrowhawk', 'SnowyOwl', 'Hornbill', 'Toucan', 
  'Macaw', 'Cockatoo', 'Parakeet', 'Nightjar', 'Swiftlet'
];

export function generateUsername() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}${animal}${num}`;
}