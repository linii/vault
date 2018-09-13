import {
  attribute,
  focusable,
  value,
  clickable,
  isPresent,
  collection,
  fillable,
  text,
  triggerable,
} from 'ember-cli-page-object';
import { getter } from 'ember-cli-page-object/macros';

export default {
  hasStringList: isPresent('[data-test-component=string-list]'),
  hasTextFile: isPresent('[data-test-component=text-file]'),
  hasTTLPicker: isPresent('[data-test-component=ttl-picker]'),
  hasJSONEditor: isPresent('[data-test-component=json-editor]'),
  hasSelect: isPresent('select'),
  hasInput: isPresent('input'),
  hasCheckbox: isPresent('input[type=checkbox]'),
  hasTextarea: isPresent('textarea'),
  hasTooltip: isPresent('[data-test-component=info-tooltip]'),
  tooltipTrigger: focusable('[data-test-tool-tip-trigger]'),
  tooltipContent: text('[data-test-help-text]'),

  fields: collection('[data-test-field]', {
    clickLabel: clickable('label'),
    for: attribute('for', 'label'),
    labelText: text('label', { multiple: true }),
    input: fillable('input'),
    select: fillable('select'),
    textarea: fillable('textarea'),
    change: triggerable('keyup', 'input'),
    inputValue: value('input'),
    textareaValue: value('textarea'),
    inputChecked: attribute('checked', 'input[type=checkbox]'),
    selectValue: value('select'),
  }),
  fillInTextarea: async function(name, value) {
    let field = this.fields.filterBy('for', name)[0];
    return field.textarea(value);
  },
  fillIn: async function(name, value) {
    return this.fields.filterBy('for', name)[0].input(value);
  },
  field: getter(function() {
    return this.fields(0);
  }),
};
