import faker from 'faker';
 const cartText = `<div>you have ${faker.random.number()} items</div>`;

 document.querySelector('#dev-cart').innerHTML = cartText;