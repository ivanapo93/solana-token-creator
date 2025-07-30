/**
 * @jest-environment jsdom
 */

import {
    handleTokenCreation
} from './app.js';

describe('handleTokenCreation', () => {
    it('should be called when the create token button is clicked', () => {
        document.body.innerHTML = `
      <button id="createTokenBtn"></button>
    `;
        const createTokenBtn = document.getElementById('createTokenBtn');
        const handleTokenCreation = jest.fn();
        createTokenBtn.addEventListener('click', handleTokenCreation);
        createTokenBtn.click();
        expect(handleTokenCreation).toHaveBeenCalled();
    });
});
