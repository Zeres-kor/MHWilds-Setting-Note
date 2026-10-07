'use strict';
(() => {
  const routes = {saved:['savedPage','저장 세팅'],inventory:['inventoryPage','보유 호석'],rules:['rulesDialog','태그 기준'],candidates:['candidateDialog','호석 후보 검색'],build:['buildDialog','세팅 검색']};
  let current = null;
  const header = document.querySelector('header');
  function syncHeaderHeight() {
    document.documentElement.style.setProperty('--app-header-height', header.getBoundingClientRect().height + 'px');
  }
  syncHeaderHeight();
  new ResizeObserver(syncHeaderHeight).observe(header, {box:'border-box'});
  function renderRoute() {
    const requested = location.hash.slice(1);
    const route = Object.hasOwn(routes, requested) ? requested : 'inventory';
    if (requested !== route) history.replaceState(null, '', '#' + route);
    if (current === route) return;
    if (current) document.getElementById(routes[current][0]).dispatchEvent(new Event('page-leave'));
    for (const [key,[id]] of Object.entries(routes)) document.getElementById(id).hidden = key !== route;
    document.querySelectorAll('nav [data-route]').forEach(button => {
      if(button.dataset.route===route)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    current = route;
    document.title = routes[route][1] + ' · MHWilds 세팅노트';
    document.getElementById(routes[route][0]).dispatchEvent(new Event('page-enter'));
    window.scrollTo(0,0);
    document.getElementById('main').focus({preventScroll:true});
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-route]');
    if(!button || button.disabled)return;
    location.hash = button.dataset.route;
  });
  window.addEventListener('hashchange',renderRoute);
  document.addEventListener('DOMContentLoaded',renderRoute);
})();
