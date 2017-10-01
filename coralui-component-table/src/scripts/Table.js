/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2017 Adobe Systems Incorporated
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */

import Component from 'coralui-mixin-component';
import {DragAction} from 'coralui-dragaction';
import TableColumn from './TableColumn';
import TableCell from './TableCell';
import TableHeaderCell from './TableHeaderCell';
import TableRow from './TableRow';
import TableHead from './TableHead';
import TableBody from './TableBody';
import TableFoot from './TableFoot';
import 'coralui-component-button';
import 'coralui-component-checkbox';
import base from '../templates/base';
import {Collection, SelectableCollection} from 'coralui-collection';
import {getCellByIndex, getColumns, getCells, getContentCells, getHeaderCells, getRows, getSiblingsOf, getIndexOf, watchForWebFontLoad, divider} from './TableUtil';
import {transform, validate, commons, Keys} from 'coralui-util';

// Handles relayouting once web font is loaded
watchForWebFontLoad();

const CLASSNAME = 'coral-Table-wrapper';

/**
 Enum for table variant values.
 
 @enum {String}
 @memberof Coral.Table
 */
const variant = {
  /** A default table. */
  DEFAULT: 'default',
  /** A list table using thumbnails as selectable checkboxes. */
  LIST: 'list'
};

const ALL_VARIANT_CLASSES = [];
for (const variantValue in variant) {
  ALL_VARIANT_CLASSES.push(`${CLASSNAME}--${variant[variantValue]}`);
}

const IS_HIDDEN = 'is-hidden';
const IS_DISABLED = 'is-disabled';
const IS_SORTED = 'is-sorted';
const IS_UNSELECTABLE = 'is-unselectable';
const IS_FIRST_ITEM_DRAGGED = 'is-draggedFirstItem';
const IS_LAST_ITEM_DRAGGED = 'is-draggedLastItem';
const IS_DRAGGING_CLASS = 'is-dragging';
const IS_BEFORE_CLASS = 'is-before';
const IS_AFTER_CLASS = 'is-after';
const IS_IE_OR_EDGE = navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > 0 ||
  navigator.userAgent.indexOf('Edge') !== -1;
const IS_FIREFOX = navigator.userAgent.indexOf('Firefox') !== -1;
const KEY_SPACE = Keys.keyToCode('space');

/**
 @class Coral.Table
 @classdesc A Table component
 @htmltag coral-table
 @htmlbasetag table
 @extends HTMLTableElement
 @extends Coral.mixin.component
 */
class Table extends Component(HTMLTableElement) {
  constructor() {
    super();
    
    // Templates
    this._elements = {
      head: this.querySelector('thead[is="coral-table-head"]') || new TableHead(),
      body: this.querySelector('tbody[is="coral-table-body"]') || new TableBody(),
      foot: this.querySelector('tfoot[is="coral-table-foot"]') || new TableFoot(),
      columns: this.querySelector('colgroup') || document.createElement('colgroup')
    };
    base.call(this._elements);
    
    // Events
    this._delegateEvents({
      // Table specific
      'global:coral-commons:_webfontload': '_resetLayout',
      'change [coral-table-select]': '_onSelectAll',
      'capture:scroll [handle="container"]': '_onScroll',
  
      // Head specific
      'click thead[is="coral-table-head"] th[is="coral-table-headercell"]': '_onHeaderCellSort',
      'coral-dragaction:dragstart thead[is="coral-table-head"] th[is="coral-table-headercell"]': '_onHeaderCellDragStart',
      'coral-dragaction:drag thead[is="coral-table-head"] tr[is="coral-table-row"] > th[is="coral-table-headercell"]': '_onHeaderCellDrag',
      'coral-dragaction:dragend thead[is="coral-table-head"] tr[is="coral-table-row"] > th[is="coral-table-headercell"]': '_onHeaderCellDragEnd',
      // a11y
      'key:enter th[is="coral-table-headercell"]': '_onHeaderCellSort',
      'key:space th[is="coral-table-headercell"]': '_onHeaderCellSort',
  
      // Body specific
      'click tbody[is="coral-table-body"] [coral-table-rowlock]': '_onRowLock',
      'click tbody[is="coral-table-body"] [coral-table-rowselect]': '_onRowSelect',
      'click tbody[is="coral-table-body"] tr[is="coral-table-row"][selectable] [coral-table-cellselect]': '_onCellSelect',
      'capture:mousedown tbody[is="coral-table-body"] [coral-table-roworder]:not([disabled])': '_onRowOrder',
      'capture:touchstart tbody[is="coral-table-body"] [coral-table-roworder]:not([disabled])': '_onRowOrder',
      'coral-dragaction:dragstart tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onRowDragStart',
      'coral-dragaction:drag tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onRowDrag',
      'coral-dragaction:dragover tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onRowDragOver',
      'coral-dragaction:dragend tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onRowDragEnd',
      // a11y
      'mousedown tbody[is="coral-table-body"] [coral-table-rowselect]': '_onRowDown',
      'key:enter tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onRowSelect',
      'key:space tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onRowSelect',
      'key:pageup tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onFocusPreviousItem',
      'key:pagedown tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onFocusNextItem',
      'key:left tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onFocusPreviousItem',
      'key:right tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onFocusNextItem',
      'key:up tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onFocusPreviousItem',
      'key:down tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onFocusNextItem',
      'key:home tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onFocusFirstItem',
      'key:end tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onFocusLastItem',
      'key:shift+pageup tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onSelectPreviousItem',
      'key:shift+pagedown tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onSelectNextItem',
      'key:shift+left tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onSelectPreviousItem',
      'key:shift+right tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onSelectNextItem',
      'key:shift+up tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onSelectPreviousItem',
      'key:shift+down tbody[is="coral-table-body"] tr[is="coral-table-row"]': '_onSelectNextItem',
  
      // Private
      'coral-table-row:_multiplechanged': '_onRowMultipleChanged',
      'coral-table-row:_beforeselectedchanged': '_onBeforeRowSelectionChanged',
      'coral-table-row:_selectedchanged': '_onRowSelectionChanged',
      'coral-table-row:_lockedchanged': '_onRowLockedChanged',
      'coral-table-row:_change': '_onRowChange',
      'coral-table-row:_contentchanged': '_onRowContentChanged',
      'coral-table-headercell:_contentchanged': '_resetLayout',
      'coral-table-head:_contentchanged': '_onHeadContentChanged',
      'coral-table-body:_contentchanged': '_onBodyContentChanged',
      'coral-table-body:_empty': '_onBodyEmpty',
      'coral-table-column:_fixedwidthchanged': '_onFixedWidthChanged',
      'coral-table-column:_orderablechanged': '_onColumnOrderableChanged',
      'coral-table-column:_sortablechanged': '_onColumnSortableChanged',
      'coral-table-column:_sortabledirectionchanged': '_onColumnSortableDirectionChanged',
      'coral-table-column:_hiddenchanged': '_onColumnHiddenChanged',
      'coral-table-column:_beforecolumnsort': '_onBeforeColumnSort',
      'coral-table-column:_sort': '_onColumnSort',
      'coral-table-head:_stickychanged': '_onHeadStickyChanged'
    });
  
    // Required for coral-table:change event
    this._oldSelection = [];
    // References selected items in their selection order and is only used for keyboard selection
    this._lastSelectedItems = {
      items: [],
      direction: null
    };
    
    // Don't sort by default
    this._allowSorting = false;
  
    // Debounce timer
    this._timeout = null;
    // Debounce wait in milliseconds
    this._wait = 50;
    
    // Used by resizing detector
    this._resetLayout = this._resetLayout.bind(this);
  
    // Initialize content MO
    this._observer = new MutationObserver(this._handleMutations.bind(this));
    this._observer.observe(this, {
      childList: true,
      subtree: true
    });
  }
  
  /**
   The head of the table.
   
   @type {HTMLElement}
   @contentzone
   @memberof Coral.Table#
   */
  get head() {
    return this._getContentZone(this._elements.head);
  }
  set head(value) {
    this._setContentZone('head', value, {
      handle: 'head',
      tagName: 'thead',
      insert: function(content) {
        // Using the native table API allows to position the head element at the correct position.
        this._elements.table.tHead = content;
      }
    });
  }
  
  /**
   The body of the table. Multiple bodies are not supported.
   
   @type {HTMLElement}
   @contentzone
   @memberof Coral.Table#
   */
  get body() {
    return this._getContentZone(this._elements.body);
  }
  set body(value) {
    this._setContentZone('body', value, {
      handle: 'body',
      tagName: 'tbody',
      insert: function(content) {
        this._elements.table.appendChild(content);
      }
    });
  }
  
  /**
   The foot of the table.
   
   @type {HTMLElement}
   @contentzone
   @memberof Coral.Table#
   */
  get foot() {
    return this._getContentZone(this._elements.foot);
  }
  set foot(value) {
    this._setContentZone('foot', value, {
      handle: 'foot',
      tagName: 'tfoot',
      insert: function(content) {
        // Using the native table API allows to position the head element at the correct position.
        this._elements.table.tFoot = content;
      }
    });
  }
  
  /**
   The columns of the table.
   
   @type {HTMLElement}
   @contentzone
   @memberof Coral.Table#
   */
  get columns() {
    return this._getContentZone(this._elements.columns);
  }
  set columns(value) {
    this._setContentZone('columns', value, {
      handle: 'columns',
      tagName: 'colgroup',
      insert: function(content) {
        this._elements.table.appendChild(content);
      }
    });
  }
  
  /**
   The table's variant.
   
   @type {Coral.Table.variant}
   @default Coral.Table.variant.DEFAULT
   @htmlattribute variant
   @htmlattributereflected
   @memberof Coral.Table#
   */
  get variant() {
    return this._variant || variant.DEFAULT;
  }
  set variant(value) {
    value = transform.string(value).toLowerCase();
    this._variant = validate.enumeration(variant)(value) && value || variant.DEFAULT;
    this._reflectAttribute('variant', this._variant);
  
    this.classList.remove.apply(this.classList, ALL_VARIANT_CLASSES);
    this.classList.add(`${CLASSNAME}--${this._variant}`);
  }
  
  /**
   Whether the items are selectable.
   
   @type {Boolean}
   @default false
   @htmlattribute selectable
   @htmlattributereflected
   @memberof Coral.Table#
   */
  get selectable() {
    return this._selectable || false;
  }
  set selectable(value) {
    this._selectable = transform.booleanAttr(value);
    this._reflectAttribute('selectable', this._selectable);
  
    const rows = getRows([this.body]);
  
    if (this._selectable) {
      rows.forEach(function(row) {
        row.setAttribute('_selectable', '');
      });
    }
    else {
      // Clear selection
      rows.forEach(function(row) {
        row.removeAttribute('_selectable');
      });
    
      this.trigger('coral-table:change', {
        selection: [],
        oldSelection: this._oldSelection
      });
    
      // Sync used collection
      this._oldSelection = [];
      this._lastSelectedItems.items = [];
    }

    // a11y
    this._toggleFocusable();
  }
  
  /**
   Whether the table is orderable. If the table is sorted, ordering handles are hidden.
   
   @type {Boolean}
   @default false
   @htmlattribute orderable
   @htmlattributereflected
   @memberof Coral.Table#
   */
  get orderable() {
    return this._orderable || false;
  }
  set orderable(value) {
    this._orderable = transform.booleanAttr(value);
    this._reflectAttribute('orderable', this._orderable);
  
    getRows([this.body]).forEach(function(row) {
      row[this._orderable ? 'setAttribute' : 'removeAttribute']('_orderable', '');
    }, this);
  
    // a11y
    this._toggleFocusable();
  }
  
  /**
   Whether multiple items can be selected.
   
   @type {Boolean}
   @default false
   @htmlattribute multiple
   @htmlattributereflected
   @memberof Coral.Table#
   */
  get multiple() {
    return this._multiple || false;
  }
  set multiple(value) {
    this._multiple = transform.booleanAttr(value);
    this._reflectAttribute('multiple', this._multiple);
    
    this._elements.table.setAttribute('aria-multiselectable', this._multiple);
  
    // Deselect all except last
    if (!this.multiple) {
    
      const selection = this.selectedItems;
    
      if (selection.length > 1) {
        selection.forEach(function(row, i) {
          // Don't trigger too many events
          row.set('selected', (i === selection.length - 1), true);
        });
      
        // Synchronise the table select handle
        const newSelection = this.selectedItems;
      
        if (newSelection.length) {
          this._setSelectAllHandleState('indeterminate');
        }
        else {
          this._setSelectAllHandleState('unchecked');
        }
      
        this.trigger('coral-table:change', {
          selection: newSelection,
          oldSelection: selection
        });

        // Sync used collection
        this._oldSelection = newSelection;
        this._lastSelectedItems.items = newSelection;
      }
    }
  }
  
  /**
   Whether the table rows can be locked/unlocked.
   
   @type {Boolean}
   @default false
   @htmlattribute lockable
   @htmlattributereflected
   @memberof Coral.Table#
   */
  get lockable() {
    return this._lockable || false;
  }
  set lockable(value) {
    this._lockable = transform.booleanAttr(value);
    this._reflectAttribute('lockable', this._lockable);
  
    getRows([this.body]).forEach(function(row) {
      row[this._lockable ? 'setAttribute' : 'removeAttribute']('_lockable', '');
    }, this);
  
    // a11y
    this._toggleFocusable();
  }
  
  /**
   Returns an Array containing the selected items.
   
   @type {Array.<HTMLElement>}
   @readonly
   @memberof Coral.Table#
   */
  get selectedItems() {
    return this.items._getAllSelected();
  }
  
  /**
   Returns the first selected item of the table. The value <code>null</code> is returned if no element is
   selected.
   
   @type {HTMLElement}
   @readonly
   @memberof Coral.Table#
   */
  get selectedItem() {
    return this.items._getFirstSelected();
  }
  
  /**
   The Collection Interface that allows interacting with the items that the component contains. See
   {@link Coral.Collection} for more details.
   
   @type {Coral.Collection}
   @readonly
   @memberof Coral.Table#
   */
  get items() {
    // Construct the collection on first request
    if (!this._items) {
      this._items = new SelectableCollection({
        host: this,
        container: this.body,
        itemBaseTagName: 'tr',
        itemTagName: 'coral-table-row'
      });
    }
  
    return this._items;
  }
  
  /** @private */
  _onSelectAll(event) {
    if (this.selectable) {
      let rows = getRows([this.body]);
      
      if (rows.length) {
        if (this.multiple) {
          const selected = event.target.checked;
          
          rows.forEach(function(row) {
            // Don't trigger too many events
            row.set('selected', selected, true);
          });
          
          rows = selected ? rows : [];
          
          // Synchronise the table select handle
          this._setSelectAllHandleState(selected ? 'checked' : 'unchecked');
          
          this.trigger('coral-table:change', {
            selection: rows,
            oldSelection: this._oldSelection
          });
          
          // Sync used collection
          this._oldSelection = rows;
          this._lastSelectedItems.items = rows;
        }
        else {
          // Only select last item
          const lastItem = rows[rows.length - 1];
          lastItem.selected = !lastItem.selected;
        }
      }
    }
  }
  
  _triggerChangeEvent() {
    if (!this._preventTriggeringEvents) {
      const selectedItems = this.selectedItems;
      this.trigger('coral-table:change', {
        oldSelection: this._oldSelection,
        selection: selectedItems
      });
      
      this._oldSelection = selectedItems;
    }
  }
  
  /** @private */
  _onRowOrder(event) {
    const table = this;
    const row = event.target.closest('tr[is="coral-table-row"]');
    
    if (row && table.orderable) {
      const head = table.head;
      const body = table.body;
      const sticky = head && head.sticky;
      const style = row.getAttribute('style');
      const index = getIndexOf(row);
      const oldBefore = row.nextElementSibling;
      const dragAction = new DragAction(row);
      const items = getRows([body]);
      const tableBoundingClientRect = table.getBoundingClientRect();
      const rowBoundingClientRect = row.getBoundingClientRect();
      
      if (row === items[0]) {
        table.classList.add(IS_FIRST_ITEM_DRAGGED);
      }
      else if (row === items[items.length - 1]) {
        table.classList.add(IS_LAST_ITEM_DRAGGED);
      }
      
      dragAction.axis = 'vertical';
      // Handle the scroll in table
      dragAction.scroll = false;
      // Specify selection handle directly on the row if none found
      dragAction.handle = row.querySelector('[coral-table-roworder]');
      
      // The row placeholder indicating where the dragged element will be dropped
      const placeholder = row.cloneNode(true);
      placeholder.classList.add('coral-Table-row--placeholder');
      
      // Prepare the row position before inserting its placeholder
      row.style.top = (rowBoundingClientRect.top - tableBoundingClientRect.top) + 'px';
      
      // Prevent change event from triggering if the cloned node is selected
      table._preventTriggeringEvents = true;
      body.insertBefore(placeholder, row.nextElementSibling);
      window.requestAnimationFrame(() => {
        table._preventTriggeringEvents = false;
      });
      
      // Store the data to avoid re-reading the layout on drag events
      const dragData = {
        placeholder: placeholder,
        index: index,
        oldBefore: oldBefore,
        // Backup styles to restore them later
        style: {
          row: style
        }
      };
      
      // Required to handle the scrolling of the sticky table on drag events
      if (sticky) {
        dragData.sticky = sticky;
        dragData.tableTop = tableBoundingClientRect.top;
        dragData.tableSize = tableBoundingClientRect.height;
        dragData.headSize = parseFloat(table._elements.container.style.marginTop);
        dragData.dragElementSize = rowBoundingClientRect.height;
      }
      
      row.dragAction._dragData = dragData;
    }
  }
  
  /** @private */
  _onHeaderCellSort(event) {
    const table = this;
    const matchedTarget = event.matchedTarget;
    
    // Don't sort if the column was dragged
    if (!matchedTarget._isDragging) {
      const column = table._getColumn(matchedTarget);
      // Only sort if actually sortable and event not defaultPrevented
      if (column && column.sortable) {
        event.preventDefault();
        column._sort();
        
        // Restore focus on the header cell in any case
        matchedTarget.focus();
      }
    }
  }
  
  /** @private */
  _onHeaderCellDragStart(event) {
    const table = this;
    const matchedTarget = event.matchedTarget;
    const dragElement = event.detail.dragElement;
    const siblingHeaderCellSelector = matchedTarget === dragElement ? 'th[is="coral-table-headercell"]' : 'th[is="coral-table-headercell"] coral-table-headercell-content';
    const tableBoundingClientRect = table.getBoundingClientRect();
    
    // Store the data to be used on drag events
    dragElement.dragAction._dragData = {
      draggedColumnIndex: getIndexOf(matchedTarget),
      tableLeft: tableBoundingClientRect.left,
      tableSize: tableBoundingClientRect.width,
      dragElementSize: matchedTarget.getBoundingClientRect().width,
      tableScrollWidth: table._elements.container.scrollWidth
    };
    
    getSiblingsOf(matchedTarget, siblingHeaderCellSelector, 'prevAll').forEach(function(item) {
      item.classList.add(IS_BEFORE_CLASS);
    });
    
    getSiblingsOf(matchedTarget, siblingHeaderCellSelector, 'nextAll').forEach(function(item) {
      item.classList.add(IS_AFTER_CLASS);
    });
  }
  
  /** @private */
  _onHeaderCellDrag(event) {
    const table = this;
    const container = table._elements.container;
    const matchedTarget = event.matchedTarget;
    const dragElement = event.detail.dragElement;
    const dragData = dragElement.dragAction._dragData;
    const row = matchedTarget.parentElement;
    const isHeaderCellDragged = matchedTarget === dragElement;
    const containerScrollLeft = container.scrollLeft;
    const documentScrollLeft = document.body.scrollLeft;
    
    // Prevent sorting on header cell click if the header cell is being dragged
    matchedTarget._isDragging = true;
    
    // Scroll left/right if table edge is reached
    const position = dragElement.getBoundingClientRect().left - dragData.tableLeft;
    const leftScrollLimit = 0;
    const rightScrollLimit =  dragData.tableSize - dragData.dragElementSize;
    const scrollOffset = 10;
    
    if (position < leftScrollLimit) {
      container.scrollLeft -= scrollOffset;
    }
    // 2nd condition is required to avoid increasing the container scroll width
    else if (position > rightScrollLimit && (containerScrollLeft + dragData.tableSize < dragData.tableScrollWidth)) {
      container.scrollLeft += scrollOffset;
    }
    
    // Position sibling header cells based on the dragged element
    getHeaderCells(row).forEach(function(headerCell) {
      const draggedHeaderCell = isHeaderCellDragged ? headerCell : headerCell.content;
      
      if (!draggedHeaderCell.classList.contains(IS_DRAGGING_CLASS)) {
  
        const offsetLeft = draggedHeaderCell.getBoundingClientRect().left + documentScrollLeft;
        const isAfter = event.detail.pageX < (offsetLeft + draggedHeaderCell.offsetWidth / 3);
        
        draggedHeaderCell.classList.toggle(IS_AFTER_CLASS, isAfter);
        draggedHeaderCell.classList.toggle(IS_BEFORE_CLASS, !isAfter);
  
        const columnIndex = getIndexOf(headerCell);
        const dragElementIndex = getIndexOf(matchedTarget);
        
        // Place headercell after
        if (draggedHeaderCell.classList.contains(IS_AFTER_CLASS)) {
          if (columnIndex < dragElementIndex) {
            const draggedHeaderCellComputedStyle = window.getComputedStyle(draggedHeaderCell);
            const nextHeaderCellPadding = parseFloat(draggedHeaderCellComputedStyle.paddingLeft) + parseFloat(draggedHeaderCellComputedStyle.paddingRight);
            
            // Position the header cells based on their siblings position
            if (isHeaderCellDragged) {
              const nextHeaderCellWidth = parseFloat(draggedHeaderCellComputedStyle.width);
              draggedHeaderCell.style.left = (nextHeaderCellWidth + nextHeaderCellPadding) + 'px';
            }
            else {
              const nextHeaderCell = getSiblingsOf(headerCell, 'th[is="coral-table-headercell"]', 'next');
              const nextHeaderCellLeftOffset = nextHeaderCell.getBoundingClientRect().left + documentScrollLeft;
              draggedHeaderCell.style.left = nextHeaderCellLeftOffset - nextHeaderCellPadding + containerScrollLeft + 'px';
            }
          }
          else {
            draggedHeaderCell.style.left = '';
          }
        }
        
        // Place headerCell before
        if (draggedHeaderCell.classList.contains(IS_BEFORE_CLASS)) {
          if (columnIndex > dragElementIndex) {
            const prev = getSiblingsOf(headerCell, 'th[is="coral-table-headercell"]', 'prev');
            const prevHeaderCellComputedStyle = window.getComputedStyle(prev);
            const beforeHeaderCellPadding = parseFloat(prevHeaderCellComputedStyle.paddingLeft) + parseFloat(prevHeaderCellComputedStyle.paddingRight);
            
            // Position the header cells based on their siblings position
            if (isHeaderCellDragged) {
              const beforeHeaderCellWidth = parseFloat(prevHeaderCellComputedStyle.width);
              draggedHeaderCell.style.left = - (beforeHeaderCellWidth + beforeHeaderCellPadding) + 'px';
            }
            else {
              const beforeHeaderCellLeftOffset = prev.getBoundingClientRect().left + documentScrollLeft;
              draggedHeaderCell.style.left = beforeHeaderCellLeftOffset - beforeHeaderCellPadding + containerScrollLeft + 'px';
            }
          }
          else {
            draggedHeaderCell.style.left = '';
          }
        }
      }
    });
  }
  
  /** @private */
  _onHeaderCellDragEnd(event) {
    const table = this;
    const matchedTarget = event.matchedTarget;
    const dragElement = event.detail.dragElement;
    const dragData = dragElement.dragAction._dragData;
    const column = table._getColumn(matchedTarget);
    const headRows = getRows([table.head]);
    const isHeaderCellDragged = matchedTarget === dragElement;
    const row = matchedTarget.parentElement;
    
    // Select all cells in table body and foot given the index
    const getCellsByIndex = (cellIndex) => {
      const cells = [];
      const rows = getRows([table.body, table.foot]);
      rows.forEach(function(row) {
        const cell = getCellByIndex(row, cellIndex);
        if (cell) {
          cells.push(cell);
        }
      });
      return cells;
    };
    
    const cells = getCellsByIndex(getIndexOf(matchedTarget));
    let before = null;
    let after = null;
    
    // Siblings are either header cell or header cell content based on the current sticky state
    if (isHeaderCellDragged) {
      before = row.querySelector('th[is="coral-table-headercell"]' + '.' + IS_AFTER_CLASS);
      
      after = row.querySelectorAll('th[is="coral-table-headercell"]' + '.' + IS_BEFORE_CLASS);
      after = after.length ? after[after.length - 1] : null;
    }
    else {
      before = row.querySelector('th[is="coral-table-headercell"] > coral-table-headercell-content' + '.' + IS_AFTER_CLASS);
      before = before ? before.parentNode : null;
      
      after = row.querySelectorAll('th[is="coral-table-headercell"] > coral-table-headercell-content' + '.' + IS_BEFORE_CLASS);
      after = after.length ? after[after.length - 1].parentNode : null;
    }
    
    // Did header cell order change ?
    const swapped = !((before && before.previousElementSibling === matchedTarget) || (after && after.nextElementSibling === matchedTarget));
    
    // Switch whole columns based on the new position of the dragged element
    if (swapped) {
      const beforeColumn = before ? table._getColumn(before) : null;
      
      // Trigger the event on table
      const beforeEvent = table.trigger('coral-table:beforecolumndrag', {
        column: column,
        before: beforeColumn
      });
      
      const oldBefore = column.nextElementSibling;
      
      if (!beforeEvent.defaultPrevented) {
        // Insert the headercell at the new position
        if (before) {
          const beforeIndex = getIndexOf(before);
          const beforeCells = getCellsByIndex(beforeIndex);
          cells.forEach(function(cell, i) {
            cell.parentNode.insertBefore(cell, beforeCells[i]);
          });
          
          // Sync <coral-table-column> by reordering it too
          const beforeCol = getColumns(table.columns)[beforeIndex];
          if (beforeCol && column) {
            table.columns.insertBefore(column, beforeCol);
          }
          
          row.insertBefore(matchedTarget, before);
        }
        if (after) {
          const afterIndex = getIndexOf(after);
          const afterCells = getCellsByIndex(afterIndex);
          cells.forEach(function(cell, i) {
            cell.parentNode.insertBefore(cell, afterCells[i].nextElementSibling);
          });
          
          // Sync <coral-table-column> by reordering it too
          const afterCol = getColumns(table.columns)[afterIndex];
          if (afterCol && column) {
            table.columns.insertBefore(column, afterCol.nextElementSibling);
          }
          
          row.insertBefore(matchedTarget, after.nextElementSibling);
        }
        
        // Trigger the order event if the column position changed
        if (dragData.draggedColumnIndex !== getIndexOf(matchedTarget)) {
          const newBefore = getColumns(table.columns)[getIndexOf(column) + 1];
          table.trigger('coral-table:columndrag', {
            column: column,
            oldBefore: oldBefore,
            before: newBefore || null
          });
        }
      }
    }
    
    // Restoring default header cells styling
    headRows.forEach(function(row) {
      getHeaderCells(row).forEach(function(headerCell) {
        headerCell = isHeaderCellDragged ? headerCell :  headerCell.content;
        headerCell.classList.remove(IS_AFTER_CLASS);
        headerCell.classList.remove(IS_BEFORE_CLASS);
        headerCell.style.left = '';
      });
    });
    
    // Trigger a relayout
    table._resetLayout();
    
    window.requestAnimationFrame(function() {
      // Allows sorting again after dragging completed
      matchedTarget._isDragging = undefined;
      // Refocus the dragged element manually
      table._toggleElementTabIndex(dragElement, null, true);
    });
  }
  
  /** @private */
  _onCellSelect(event) {
    const cell = event.target.closest('td[is="coral-table-cell"]');
    
    if (cell) {
      cell.selected = !cell.selected;
    }
  }
  
  /** @private */
  _onRowSelect(event) {
    const table = this;
    const row = event.target.closest('tr[is="coral-table-row"]');
    
    if (row) {
      // Ignore selection if the row is locked
      if (table.lockable && row.locked) {
        return;
      }
      
      // Restore text-selection
      table.classList.remove(IS_UNSELECTABLE);
      
      // Prevent row selection when it's the selection handle and the target is an input
      if (table.selectable && (Keys.filterInputs(event) || !row.hasAttribute('coral-table-rowselect'))) {
        // Pressing space scrolls the sticky table to the bottom if scrollable
        if (event.keyCode === KEY_SPACE) {
          event.preventDefault();
        }
        
        if (event.shiftKey) {
          let lastSelectedItem = table._lastSelectedItems.items[table._lastSelectedItems.items.length - 1];
          const lastSelectedDirection = table._lastSelectedItems.direction;
          
          // If no selected items, by default set the first item as last selected item
          if (!table.selectedItem) {
            const rows = getRows([table.body]);
            if (rows.length) {
              lastSelectedItem = rows[0];
              lastSelectedItem.selected = true;
            }
          }
          
          // Don't continue if table has no items or if the last selected item is the clicked item
          if (lastSelectedItem && getIndexOf(row) !== getIndexOf(lastSelectedItem)) {
            
            // Range selection direction
            const before = getIndexOf(row) < getIndexOf(lastSelectedItem);
            const rangeQuery = before ? 'prevUntil' : 'nextUntil';
            
            // Store direction
            table._lastSelectedItems.direction = before ? 'up' : 'down';
            
            if (!row.selected) {
              
              // Store selection range
              const selectionRange = getSiblingsOf(lastSelectedItem, 'tr[is="coral-table-row"]:not([selected])', rangeQuery);
              selectionRange[before ? 'push' : 'unshift'](lastSelectedItem);
              
              // Direction change
              if (!before && lastSelectedDirection === 'up' || before && lastSelectedDirection === 'down') {
                selectionRange.forEach(function(item) {
                  item.selected = false;
                });
              }
              
              // Select item
              const selectionRangeRow = selectionRange[before ? 0 : selectionRange.length - 1];
              selectionRangeRow.selected = true;
              getSiblingsOf(selectionRangeRow, row, rangeQuery).forEach(function(item) {
                item.selected = true;
              });
            }
            else {
              const selection = getSiblingsOf(lastSelectedItem, row, rangeQuery);
              
              // If some items are not selected
              if (selection.some(function(item) {
                  return (!item.hasAttribute('selected'));
                })) {
                // Select all items in between
                selection.forEach(function(item) {
                  item.selected = true;
                });
                
                // Deselect selected item right before/after the selection range
                getSiblingsOf(row, 'tr[is="coral-table-row"]:not([selected])', rangeQuery).forEach(function(item) {
                  item.selected = false;
                });
              }
              else {
                // Deselect items
                selection[before ? 'push' : 'unshift'](lastSelectedItem);
                selection.forEach(function(item) {
                  item.selected = false;
                });
              }
            }
          }
        }
        else {
          // Remove direction if simple click without shift key pressed
          table._lastSelectedItems.direction = null;
        }
        
        // Select the row that was clicked and keep the row selected if shift key was pressed
        row.selected = event.shiftKey ? true : !row.selected;
        
        // Don't focus the row if the target isn't the row and focusable
        table._focusItem(row, event.target === event.matchedTarget || event.target.tabIndex < 0);
      }
    }
  }
  
  /** @private */
  _onRowLock(event) {
    const table = this;
    
    if (table.lockable) {
      const row = event.target.closest('tr[is="coral-table-row"]');
      if (row) {
        event.preventDefault();
        event.stopPropagation();
        row.locked = !row.locked;
        
        // Refocus the locked/unlocked item manually
        window.requestAnimationFrame(function() {
          table._focusItem(row, true);
        });
      }
    }
  }
  
  /** @private */
  _onRowDown(event) {
    const table = this;
    
    // Prevent text-selection
    if (table.selectedItem && event.shiftKey) {
      table.classList.add(IS_UNSELECTABLE);
      
      // @polyfill IE
      // Store text selection feature
      const onSelectStart = document.onselectstart;
      // Kill text selection feature
      document.onselectstart = function() { return false; };
      // Restore text selection feature
      window.requestAnimationFrame(function() {
        document.onselectstart = onSelectStart;
      });
    }
  }
  
  /** @private */
  _onRowDragStart(event) {
    const table = this;
    const body = table.body;
    const dragElement = event.detail.dragElement;
    const dragData = dragElement.dragAction._dragData;
    
    dragData.style.cells = [];
    getCells(dragElement).forEach((cell) => {
      // Backup styles to restore them later
      dragData.style.cells.push(cell.content.getAttribute('style'));
      // Cells will shrink otherwise
      cell.content.style.width = window.getComputedStyle(cell).width;
    });
    
    dragElement.style.position = 'absolute';
    
    // Setting drop zones allows to listen for coral-dragaction:dragover event
    dragElement.dragAction.dropZone = body.querySelectorAll('tr[is="coral-table-row"]:not(.'+ IS_DRAGGING_CLASS +')');
    
    // We cannot rely on :focus since the row is being moved in the dom while dnd
    dragElement.classList.add('is-focused');
  }
  
  /** @private */
  _onRowDrag(event) {
    const table = this;
    const body = table.body;
    const dragElement = event.detail.dragElement;
    const dragData = dragElement.dragAction._dragData;
    const firstRow = getRows([body])[0];
    
    // Insert the placeholder at the top
    if (dragElement.getBoundingClientRect().top <= firstRow.getBoundingClientRect().top) {
      table._preventTriggeringEvents = true;
      body.insertBefore(dragData.placeholder, firstRow);
      window.requestAnimationFrame(function() {
        table._preventTriggeringEvents = false;
      });
    }
    
    // Scroll up/down if table edge is reached
    if (dragData.sticky) {
      const dragElementTop = dragElement.getBoundingClientRect().top;
      const position = dragElementTop - dragData.tableTop - dragData.headSize;
      const topScrollLimit = 0;
      const bottomScrollTimit =  dragData.tableSize - dragData.dragElementSize - dragData.headSize;
      const scrollOffset = 10;
      
      // Handle the scrollbar position based on the dragged element position.
      // nextFrame is required else Chrome wouldn't take scrollTop changes in account when dragging the first row down
      window.requestAnimationFrame(function() {
        if (position < topScrollLimit) {
          table._elements.container.scrollTop -= scrollOffset;
        }
        else if (position > bottomScrollTimit) {
          table._elements.container.scrollTop += scrollOffset;
        }
      });
    }
  }
  
  /** @private */
  _onRowDragOver(event) {
    const table = this;
    const body = table.body;
    const dragElement = event.detail.dragElement;
    const dropElement = event.detail.dropElement;
    const dragData = dragElement.dragAction._dragData;
    
    // Swap the placeholder
    if (dragElement.getBoundingClientRect().top >= dropElement.getBoundingClientRect().top) {
      table._preventTriggeringEvents = true;
      body.insertBefore(dragData.placeholder, dropElement.nextElementSibling);
      window.requestAnimationFrame(function() {
        table._preventTriggeringEvents = false;
      });
    }
  }
  
  /** @private */
  _onRowDragEnd(event) {
    const table = this;
    const body = table.body;
    const dragElement = event.detail.dragElement;
    
    const dragData = dragElement.dragAction._dragData;
    const before = dragData.placeholder.nextElementSibling;
    
    // Clean up
    table.classList.remove(IS_FIRST_ITEM_DRAGGED);
    table.classList.remove(IS_LAST_ITEM_DRAGGED);
    
    body.removeChild(dragData.placeholder);
    dragElement.dragAction.destroy();
    
    // Restore specific styling
    dragElement.setAttribute('style', dragData.style.row);
    getCells(dragElement).forEach((cell, i) => {
      cell.content.setAttribute('style', dragData.style.cells[i]);
    });
    
    // Trigger the event on table
    const beforeEvent = table.trigger('coral-table:beforeroworder', {
      row: dragElement,
      before: before
    });
    
    if (!beforeEvent.defaultPrevented) {
      // Did row order change ?
      const rows = getRows([body]).filter(function(item) {
        return (item !== dragElement);
      });
      
      if (dragData.index !== rows.indexOf(dragData.placeholder)) {
        // Insert the row at the new position and prevent change event from triggering
        table._preventTriggeringEvents = true;
        body.insertBefore(dragElement, before);
        window.requestAnimationFrame(function() {
          table._preventTriggeringEvents = false;
        });
        
        // Trigger the order event if the row position changed
        table.trigger('coral-table:roworder', {
          row: dragElement,
          oldBefore: dragData.oldBefore,
          before: before
        });
      }
    }
    
    // Refocus the dragged element manually
    window.requestAnimationFrame(function() {
      dragElement.classList.remove('is-focused');
      table._focusItem(dragElement, true);
    });
  }
  
  /** @private */
  _onRowMultipleChanged(event) {
    event.stopImmediatePropagation();
    
    const table = this;
    const row = event.target;
    
    // Deselect all except last
    if (!row.multiple) {
      const selectedItems = row.selectedItems;
      table._preventTriggeringEvents = true;
      selectedItems.forEach(function(cell, i) {
        cell.selected = (i === selectedItems.length - 1);
      });
      
      window.requestAnimationFrame(function() {
        table._preventTriggeringEvents = false;
        
        table.trigger('coral-table:rowchange', {
          oldSelection: selectedItems,
          selection: row.selectedItems,
          row: row
        });
      });
    }
  }
  
  /** @private */
  _onBeforeRowSelectionChanged(event) {
    event.stopImmediatePropagation();
    
    // In single selection, if the added item is selected, the rest should be deselected
    const selectedItem = this.selectedItem;
    if (!this.multiple && selectedItem && !event.target.selected) {
      selectedItem.set('selected', false, true);
      this._removeLastSelectedItem(selectedItem);
    }
  }
  
  /** @private */
  _syncSelectAllHandle(selectedItems, items) {
    if (items.length && selectedItems.length === items.length) {
      this._setSelectAllHandleState('checked');
    }
    else if (!selectedItems.length) {
      this._setSelectAllHandleState('unchecked');
    }
    else {
      this._setSelectAllHandleState('indeterminate');
    }
  }
  
  /** @private */
  _setSelectAllHandleState(state) {
    const handle = this.querySelector('[coral-table-select]');
    
    if (handle) {
      if (state === 'checked') {
        if (typeof handle.indeterminate !== 'undefined') {
          handle.indeterminate = false;
        }
        
        if (typeof handle.checked !== 'undefined') {
          handle.checked = true;
        }
      }
      else if (state === 'unchecked') {
        if (typeof handle.indeterminate !== 'undefined') {
          handle.indeterminate = false;
        }
        
        if (typeof handle.checked !== 'undefined') {
          handle.checked = false;
        }
      }
      else if (state === 'indeterminate') {
        if (typeof handle.indeterminate !== 'undefined') {
          handle.indeterminate = true;
        }
      }
    }
  }
  
  /** @private */
  _onRowSelectionChanged(event) {
    event.stopImmediatePropagation();
    
    this._triggerChangeEvent();
    
    const table = this;
    const body = table.body;
    const row = event.target;
  
    // Synchronise the table select handle
    if (body && body.contains(row)) {
      const selection = table.selectedItems;
      const rows = getRows([body]);
      
      // Sync select all handle
      table._syncSelectAllHandle(selection, rows);
      
      // Store or remove the row reference
      table[row.selected ? '_addLastSelectedItem' : '_removeLastSelectedItem'](row);
      
      // Store selected items range
      const lastSelectedItem = table._lastSelectedItems.items[table._lastSelectedItems.items.length - 1];
      const next = table._lastSelectedItems.direction === 'down';
      if (row.selected && lastSelectedItem && lastSelectedItem.selected && getSiblingsOf(lastSelectedItem, 'tr[is="coral-table-row"][selected]', next ? 'next' : 'prev')) {
        getSiblingsOf(lastSelectedItem, 'tr[is="coral-table-row"]:not([selected])', next ? 'nextUntil' : 'prevUntil').forEach(function(item) {
          table._addLastSelectedItem(item);
        });
      }
    }
  }
  
  _onRowLockedChanged(event) {
    event.stopImmediatePropagation();
    
    const table = this;
    const body = this.body;
    const row = event.target;
    
    if (body && body.contains(row)) {
      if (row.locked) {
        // Store the row index as reference to place it back if unlocked and its selection state
        row._rowIndex = getIndexOf(row);
        
        // Insert row at first position of its tbody
        table._preventTriggeringEvents = true;
        body.insertBefore(row, getRows([body])[0]);
        window.requestAnimationFrame(function() {
          table._preventTriggeringEvents = false;
        });
        
        // Trigger event on table
        table.trigger('coral-table:rowlock', {
          row: row
        });
      }
      else {
        // Put the row back to its initial position
        if (row._rowIndex >= 0) {
          const beforeRow = getRows([body])[row._rowIndex];
          if (beforeRow) {
            // Insert row at its initial position
            table._preventTriggeringEvents = true;
            body.insertBefore(row, beforeRow.nextElementSibling);
            window.requestAnimationFrame(function() {
              table._preventTriggeringEvents = false;
            });
          }
        }
        
        // Trigger event on table
        table.trigger('coral-table:rowunlock', {
          row: row
        });
      }
    }
  }
  
  _onHeadContentChanged(event) {
    event.stopImmediatePropagation();
    
    const table = this;
    const head = table.head;
    const addedNodes = event.detail.addedNodes;
    
    for (let i = 0; i < addedNodes.length; i++) {
      const node = addedNodes[i];
      
      // Sync header cell whether sticky or not
      if (node instanceof TableHeaderCell) {
        table._toggleStickyHeaderCell(node, head.sticky);
      }
    }
  }
  
  /** @private */
  _onBodyContentChanged(event) {
    if (event.stopImmediatePropagation) {
      event.stopImmediatePropagation();
    }
    
    const table = this;
    const addedNodes = event.detail.addedNodes;
    const removedNodes = event.detail.removedNodes;
    let addedNode = null;
    const selectItem = (item) => {
      item.selected = item === addedNode;
    };
    let changed = false;
    
    // Sync added nodes
    for (let i = 0; i < addedNodes.length; i++) {
      addedNode = addedNodes[i];
      
      // Sync row state with table properties
      if (addedNode instanceof TableRow) {
        changed = true;
        
        addedNode._toggleSelectable(table.selectable);
        addedNode._toggleOrderable(table.orderable);
        addedNode._toggleLockable(table.lockable);
        
        const selectedItems = table.selectedItems;
        if (addedNode.selected) {
          // In single selection, if the added item is selected, the rest should be deselected
          if (!table.multiple && selectedItems.length > 1) {
            selectedItems.forEach(selectItem);
          }
          
          table._triggerChangeEvent();
        }
        
        // Cells are selectable too
        if (addedNode.selectable) {
          addedNode.trigger('coral-table-row:_contentchanged', {
            addedNodes: getContentCells(addedNode),
            removedNodes: []
          });
        }
        
        // Trigger collection event
        if (!table._preventTriggeringEvents) {
          table.trigger('coral-collection:add', {
            item: addedNode
          });
        }
        
        // a11y
        table._toggleFocusable();
      }
    }
    
    // Sync removed nodes
    for (let k = 0; k < removedNodes.length; k++) {
      const removedNode = removedNodes[k];
      
      if (removedNode instanceof TableRow) {
        changed = true;
        
        // If the focusable item is removed, the first item becomes the new focusable item
        if (removedNode.getAttribute('tabindex') === '0') {
          const firstItem = getRows([table.body])[0];
          if (firstItem) {
            table._focusItem(firstItem);
          }
        }
        
        if (removedNode.selected) {
          table._triggerChangeEvent();
        }
        
        // Sync _lastSelectedItems array
        const removedItemIndex = table._lastSelectedItems.items.indexOf(removedNode);
        if (removedItemIndex !== -1) {
          table._lastSelectedItems.items = table._lastSelectedItems.items.splice(removedItemIndex, 1);
        }
        
        // Trigger collection event
        if (!table._preventTriggeringEvents) {
          table.trigger('coral-collection:remove', {
            item: removedNode
          });
        }
      }
    }
    
    if (changed) {
      const items = getRows([table.body]);
      // Sync select all handle if any.
      table._syncSelectAllHandle(table.selectedItems, items);
      // Disable table features if no items.
      table._toggleInteractivity(items.length === 0);
    }
  }
  
  /** @private */
  _onBodyEmpty(event) {
    event.stopImmediatePropagation();
    this._toggleInteractivity(true);
  }
  
  /** @private */
  _onRowChange(event) {
    event.stopImmediatePropagation();
    
    if (!this._preventTriggeringEvents) {
      this.trigger('coral-table:rowchange', {
        oldSelection: event.detail.oldSelection,
        selection: event.detail.selection,
        row: event.target
      });
    }
  }
  
  /** @private */
  _onRowContentChanged(event) {
    event.stopImmediatePropagation();
    
    const table = this;
    const row = event.target;
    const addedNodes = event.detail.addedNodes;
    let addedNode = null;
    const removedNodes = event.detail.removedNodes;
    const selectItem = (item) => {
      item.selected = item === addedNode;
    };
    
    // Sync added nodes
    for (let i = 0; i < addedNodes.length; i++) {
      addedNode = addedNodes[i];
      
      // Sync row state with table properties
      if (addedNode instanceof TableCell) {
        addedNode._toggleSelectable(row.selectable);
        
        const selectedItems = row.selectedItems;
        if (addedNode.selected) {
          // In single selection, if the added item is selected, the rest should be deselected
          if (!row.multiple && selectedItems.length > 1) {
            selectedItems.forEach(selectItem);
          }
          
          row._triggerChangeEvent();
        }
        
        // Trigger collection event
        if (!table._preventTriggeringEvents) {
          row.trigger('coral-collection:add', {
            item: addedNode
          });
        }
      }
      // Add appropriate scope depending on whether headercell is in THEAD or TBODY
      else if (addedNode instanceof TableHeaderCell) {
        table._setHeaderCellScope(addedNode, row.parentNode);
      }
    }
    
    // Sync removed nodes
    for (let k = 0; k < removedNodes.length; k++) {
      const removedNode = removedNodes[k];
      
      if (removedNode instanceof TableCell) {
        
        if (removedNode.selected) {
          row._triggerChangeEvent();
        }
        
        // Trigger collection event
        if (!table._preventTriggeringEvents) {
          row.trigger('coral-collection:remove', {
            item: removedNode
          });
        }
      }
    }
  }
  
  /** @private */
  _toggleInteractivity(disable) {
    const table = this;
    const selectAll = table.querySelector('[coral-table-select]');
    
    if (selectAll) {
      selectAll.disabled = disable;
    }
    
    table.classList.toggle(IS_DISABLED, disable);
  }
  
  /** @private */
  _onFixedWidthChanged(event) {
    event.stopImmediatePropagation();
    
    const table = this;
    const head = table.head;
    const column = event.target;
    
    if (head) {
      const headRows = getRows([head]);
      const columnIndex = getIndexOf(event.target);
      
      headRows.forEach((row) => {
        const headerCell = getCellByIndex(row, columnIndex);
        if (headerCell && headerCell.tagName === 'TH') {
          headerCell[column.fixedWidth ? 'setAttribute' : 'removeAttribute']('fixedwidth', '');
        }
      });
    }
    
    table._resetLayout();
  }
  
  /** @private */
  _onColumnOrderableChanged(event) {
    event.stopImmediatePropagation();
    
    const table = this;
    const head = this.head;
    const column = event.target;
    const headerCell = table._getColumnHeaderCell(column);
    
    if (headerCell) {
      // Move the drag handle
      table._toggleDragActionHandle(headerCell, (head && head.sticky));
      
      table._resetLayout();
    }
  }
  
  /** @private */
  _onColumnSortableChanged(event) {
    event.stopImmediatePropagation();
    
    const table = this;
    const head = this.head;
    const column = event.target;
    const headerCell = table._getColumnHeaderCell(column);
    
    if (headerCell) {
      // For icons (chevron up/down) styling
      headerCell[column.sortable ? 'setAttribute' : 'removeAttribute']('sortable', '');
      
      // Toggle tab index. Sortable headercells are focusable.
      table._toggleHeaderCellTabIndex(headerCell, (head && head.sticky));
      
      table._resetLayout();
    }
  }
  
  _onColumnSortableDirectionChanged(event) {
    event.stopImmediatePropagation();
    
    const table = this;
    const column = event.target;
    const sortableDirection = TableColumn.sortableDirection;
    
    // Hide coral-table-roworder handles if table is sorted
    table.classList.toggle(IS_SORTED, table._isSorted());
    
    const headerCell = table._getColumnHeaderCell(column);
    if (headerCell) {
      // For icons (chevron up/down) styling
      headerCell.setAttribute('sortabledirection', column.sortableDirection);
      headerCell.setAttribute('aria-sort',
        column.sortableDirection === sortableDirection.DEFAULT ? 'none' : column.sortableDirection);
    }
  }
  
  _onColumnHiddenChanged(event) {
    event.stopImmediatePropagation();
    
    this._syncHiddenColumn(event.target, true);
  }
  
  _onBeforeColumnSort(event) {
    event.stopImmediatePropagation();
    
    const table = this;
    const column = event.target;
    const newSortableDirection = event.detail.newSortableDirection;
    
    const beforeEvent = table.trigger('coral-table:beforecolumnsort', {
      column: column,
      direction: newSortableDirection
    });
    
    if (!beforeEvent.defaultPrevented) {
      column.sortableDirection = newSortableDirection;
    }
  }
  
  _onColumnSort(event) {
    event.stopImmediatePropagation();
    
    // Don't sort yet
    if (!this._allowSorting) {
      return;
    }
    
    const table = this;
    const body = table.body;
    const column = event.target;
    const columnIndex = getIndexOf(column);
    const colHeaderCell = table._getColumnHeaderCell(column);
    const onInitialization = event.detail.onInitialization;
    const sortableDirection = event.detail.sortableDirection;
    const sortableType = event.detail.sortableType;
    
    const rows = getRows([body]);
    const cells = [];
    
    // Prevent change event from triggering when sorting
    if (table) {
      table._preventTriggeringEvents = true;
    }
    
    // Store a reference of the default row index for default sortable direction
    rows.forEach(function(row, i) {
      if (typeof row._defaultRowIndex === 'undefined') {
        row._defaultRowIndex = i;
      }
      
      const cell = getCellByIndex(row, columnIndex);
      if (cell) {
        cells.push(cell);
      }
    });
    
    if (column.sortableDirection === sortableDirection.ASCENDING) {
      // Remove sortable direction on sibling columns
      getSiblingsOf(column, 'col[is="coral-table-column"]').forEach(function(col) {
        col._preventSort = true;
        col.setAttribute('sortabledirection', sortableDirection.DEFAULT);
        col._preventSort = false;
      });
      
      if (colHeaderCell) {
        // For icons (chevron up/down) styling
        getSiblingsOf(colHeaderCell, 'th[is="coral-table-headercell"]').forEach(function(headerCell) {
          headerCell.setAttribute('sortabledirection', sortableDirection.DEFAULT);
          headerCell.setAttribute('aria-sort', 'none');
        });
      }
      
      // Use cell value to sort and fallback if not specified
      cells.sort(function(a, b) {
        if (column.sortableType === sortableType.ALPHANUMERIC) {
          const aText = a.value ? a.value : a.textContent;
          const bText = b.value ? b.value : b.textContent;
          return aText.localeCompare(bText);
        }
        else if (column.sortableType === sortableType.NUMBER) {
          // Remove all spaces and replace commas with dots for decimal values
          const aNumber = parseFloat(a.value ? a.value : a.textContent.replace(/\s+/g, '').replace(/,/g, '.'));
          const bNumber = parseFloat(b.value ? b.value : b.textContent.replace(/\s+/g, '').replace(/,/g, '.'));
          return aNumber > bNumber ? 1 : -1;
        }
        else if (column.sortableType === sortableType.DATE) {
          const aDate = a.value ? new Date(parseInt(a.value, 10)) : new Date(a.textContent);
          const bDate = b.value ? new Date(parseInt(b.value, 10)) : new Date(b.textContent);
          return aDate > bDate ? 1 : -1;
        }
      });
      
      // Only sort if not custom sorting
      if (column.sortableType !== sortableType.CUSTOM) {
        if (body) {
          // Insert the row at the new position if actually sorted
          cells.forEach(function(cell) {
            const row = cell.parentElement;
            // Prevent locked row to be sorted
            if (!row.locked) {
              body.appendChild(row);
            }
          });
        }
        
        // Trigger on table
        table.trigger('coral-table:columnsort', {
          column: column
        });
      }
      
      // Table is in a sorted state. Disable orderable actions
      rows.forEach(function(row) {
        if (row.dragAction) {
          row.dragAction.destroy();
        }
      });
    }
    else if (column.sortableDirection === sortableDirection.DESCENDING) {
      getSiblingsOf(column, 'col[is="coral-table-column"]').forEach(function(col) {
        col._preventSort = true;
        col.setAttribute('sortabledirection', sortableDirection.DEFAULT);
        col._preventSort = false;
      });
      
      if (colHeaderCell) {
        getSiblingsOf(colHeaderCell, 'th[is="coral-table-headercell"]').forEach(function(headerCell) {
          headerCell.setAttribute('sortabledirection', sortableDirection.DEFAULT);
          headerCell.setAttribute('aria-sort', 'none');
        });
      }
      
      cells.sort(function(a, b) {
        if (column.sortableType === sortableType.ALPHANUMERIC) {
          const aText = a.value ? a.value : a.textContent;
          const bText = b.value ? b.value : b.textContent;
          return bText.localeCompare(aText);
        }
        else if (column.sortableType === sortableType.NUMBER) {
          // Remove all spaces and replace commas with dots for decimal values
          const aNumber = parseFloat(a.value ? a.value : a.textContent.replace(/\s+/g, '').replace(/,/g, '.'));
          const bNumber = parseFloat(b.value ? b.value : b.textContent.replace(/\s+/g, '').replace(/,/g, '.'));
          return aNumber < bNumber ? 1 : -1;
        }
        else if (column.sortableType === sortableType.DATE) {
          const aDate = a.value ? new Date(parseInt(a.value, 10)) : new Date(a.textContent);
          const bDate = b.value ? new Date(parseInt(b.value, 10)) : new Date(b.textContent);
          return aDate < bDate ? 1 : -1;
        }
      });
      
      // Only sort if not custom sorting
      if (column.sortableType !== sortableType.CUSTOM) {
        if (body) {
          // Insert the row at the new position if actually sorted
          cells.forEach(function(cell) {
            const row = cell.parentElement;
            // Prevent locked row to be sorted
            if (!row.locked) {
              body.appendChild(row);
            }
          });
        }
        
        // Trigger on table
        table.trigger('coral-table:columnsort', {
          column: column
        });
      }
      
      // Table is in a sorted state. Disable orderable actions
      rows.forEach(function(row) {
        if (row.dragAction) {
          row.dragAction.destroy();
        }
      });
    }
    else if (column.sortableDirection === sortableDirection.DEFAULT && !onInitialization) {
      
      // Only sort if not custom sorting
      if (column.sortableType !== sortableType.CUSTOM) {
        // Put rows back to their initial position
        rows.sort(function(a, b) {
          return a._defaultRowIndex > b._defaultRowIndex ? 1 : -1;
        });
        
        rows.forEach(function(row) {
          // Prevent locked row to be sorted
          if (body && !row.locked) {
            body.appendChild(row);
          }
        });
        
        // Trigger on table
        table.trigger('coral-table:columnsort', {
          column: column
        });
      }
    }
    
    // Allow triggering change events again after sorting
    window.requestAnimationFrame(function() {
      table._preventTriggeringEvents = false;
    });
  }
  
  _onHeadStickyChanged(event) {
    event.stopImmediatePropagation();
    
    const table = this;
    const head = event.target;
    
    // Hide the sticky table head until it is properly positioned
    head.classList.toggle(IS_HIDDEN, head.sticky);
    
    // Defines the head height
    table._resetContainerLayout(head.sticky ? head.getBoundingClientRect().height + 'px' : null);
    
    getRows([head]).forEach(function(row) {
      getHeaderCells(row).forEach(function(headerCell) {
        table._toggleStickyHeaderCell(headerCell, head.sticky);
      });
    });
    
    // Make sure sticky styling is applied
    table.classList.toggle(CLASSNAME + '--sticky', head.sticky);
    
    // Layout sticky head
    table._resetLayout();
  }
  
  /** @private */
  _getColumnHeaderCell(column) {
    const table = this;
    const head = table.head;
    let headerCell = null;
    
    if (head) {
      const headRows = getRows([head]);
      const columnIndex = getIndexOf(column);
      if (headRows.length) {
        headerCell = getCellByIndex(headRows[headRows.length - 1], columnIndex);
        headerCell = headerCell && headerCell.tagName === 'TH' ? headerCell : null;
      }
    }
    
    return headerCell;
  }
  
  /** @private */
  _getColumn(headerCell) {
    // Get the corresponding column
    return getColumns(this.columns)[getIndexOf(headerCell)] || null;
  }
  
  /** @private */
  _toggleStickyHeaderCell(headerCell, sticky) {
    // Set the size
    this._layoutStickyCell(headerCell, sticky);
    
    // Define DragAction on the sticky cell instead of the headercell
    this._toggleDragActionHandle(headerCell, sticky);
    
    // Toggle tab index. Sortable headercells are focusable.
    this._toggleHeaderCellTabIndex(headerCell, sticky);
  }
  
  _layoutStickyCell(headerCell, sticky) {
    if (sticky) {
      const computedStyle = window.getComputedStyle(headerCell);
      
      // Don't allow the column to shrink less than its minimum allowed
      if (!headerCell.style.minWidth) {
        const width = headerCell.content.getBoundingClientRect().width;
        // Don't set the width if the header cell is hidden
        if (width > 0) {
          headerCell.style.minWidth = width + 'px';
        }
      }
      
      const cellWidth = parseFloat(computedStyle.width);
      const cellPadding = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
      const borderRightWidth = parseFloat(computedStyle.borderRightWidth);
      
      // Reflect headercell size on sticky cell
      headerCell.content.style.width = (cellWidth + cellPadding + borderRightWidth) + 'px';
    }
    else {
      // Restore headercell style
      headerCell.style.minWidth = '';
      headerCell.content.style.width = '';
      headerCell.content.style.height = '';
      headerCell.content.style.top = '';
      headerCell.content.style.marginLeft = '';
      
      // @polyfill ie/edge/firefox
      if (IS_IE_OR_EDGE || IS_FIREFOX) {
        headerCell.content.style.paddingTop = '';
      }
    }
  }
  
  /** @private */
  _toggleDragActionHandle(headerCell, sticky) {
    const column = this._getColumn(headerCell);
    
    if (headerCell.dragAction) {
      headerCell.dragAction.destroy();
    }
    if (headerCell.content.dragAction) {
      headerCell.content.dragAction.destroy();
    }
    
    if (column && column.orderable) {
      const dragAction = new DragAction(sticky ? headerCell.content : headerCell);
      dragAction.axis = 'horizontal';
      // Handle the scroll in table
      dragAction.scroll = false;
      headerCell.setAttribute('orderable', '');
    }
    else {
      headerCell.removeAttribute('orderable');
    }
  }
  
  /** @private */
  _toggleFocusable() {
    const firstItem = getRows([this.body])[0];
    if (!firstItem) {
      return;
    }
    
    const focusableItem = this._getFocusableItem();
    if (this.selectable || this.lockable || this.orderable) {
      // First item is focusable by default but don't remove the tabindex of the existing focusable item
      if (!focusableItem) {
        this._toggleElementTabIndex(firstItem);
      }
    }
    else if (focusableItem) {
      // Basic table is not focusable
      focusableItem.removeAttribute('tabindex');
    }
  }
  
  /** @private */
  _toggleElementTabIndex(element, oldFocusable, forceFocus) {
    if (oldFocusable) {
      oldFocusable.removeAttribute('tabindex');
    }
    
    element.setAttribute('tabindex', '0');
    if (forceFocus) {
      element.focus();
    }
  }
  
  /** @private */
  _toggleHeaderCellTabIndex(headerCell, sticky) {
    const column = this._getColumn(headerCell);
    const sortable = column && (column.sortable || column.orderable);
    headerCell[sortable && !sticky ? 'setAttribute' : 'removeAttribute']('tabindex', '0');
    headerCell.content[sortable && sticky ? 'setAttribute' : 'removeAttribute']('tabindex', '0');
  }
  
  /** @private */
  _syncHiddenColumn(column, resetLayout) {
    const table = this;
    const columnIndex = getIndexOf(column);
    
    if (columnIndex !== -1) {
      // Apply hidden on all cells in the column
      getRows([table._elements.table]).forEach(function(row) {
        const cell = getCellByIndex(row, columnIndex);
        if (cell) {
          cell.hidden = column.hidden;
        }
      });
      
      if (resetLayout) {
        table._resetLayout();
      }
    }
  }
  
  /** @private */
  _isSorted() {
    let column = null;
    const isSorted = getColumns(this.columns).some(function(col) {
      column = col;
      return col.sortableDirection !== TableColumn.sortableDirection.DEFAULT;
    });
    
    return isSorted ? column : false;
  }
  
  /** @private */
  _focusEdgeItem(event, first) {
    const items = getRows([this.body]);
    if (items.length) {
      event.preventDefault();
      
      let item = this._getFocusableItem();
      if (item) {
        item.removeAttribute('tabindex');
      }
      
      item = items[first ? 0 : items.length - 1];
      item.setAttribute('tabindex', '0');
      item.focus();
    }
  }
  
  /** @private */
  _focusSiblingItem(event, next) {
    const item = this._getFocusableItem();
    if (item) {
      event.preventDefault();
      
      const siblingItem = getSiblingsOf(item, 'tr[is="coral-table-row"]', next ? 'next' : 'prev');
      if (siblingItem) {
        item.removeAttribute('tabindex');
        siblingItem.setAttribute('tabindex', '0');
        siblingItem.focus();
      }
    }
  }
  
  /** @private */
  _selectSiblingItem(next) {
    if (this.selectable && this.multiple) {
      const selectedItems = this.selectedItems;
      let lastSelectedItem = this._lastSelectedItems.items[this._lastSelectedItems.items.length - 1];
      
      if (selectedItems.length) {
        // Prevent selection if we reached the edge
        if (next && lastSelectedItem.matches(':last-of-type') || !next && lastSelectedItem.matches(':first-of-type')) {
          return;
        }
        
        //Target sibling item
        const sibling = getSiblingsOf(lastSelectedItem, 'tr[is="coral-table-row"]', next ? 'next' : 'prev');
        if (!sibling.hasAttribute('selected')) {
          lastSelectedItem = sibling;
        }
        
        // Store last selection
        this._lastSelectedItems.direction = next ? 'down' : 'up';
        
        // Toggle selection
        lastSelectedItem.selected = !lastSelectedItem.selected;
      }
      else {
        if (getRows([this.body]).length) {
          const focusableItem = this._getFocusableItem();
          
          // Store last selection
          this._lastSelectedItems.direction = next ? 'down' : 'up';
          
          // Select focusable item by default if no items selected
          focusableItem.selected = true;
        }
      }
    }
    
    // Focus last selected item
    window.requestAnimationFrame(function() {
      const itemToFocus = this._lastSelectedItems.items[this._lastSelectedItems.items.length - 1];
      if (itemToFocus) {
        this._focusItem(itemToFocus, true);
      }
    }.bind(this));
  }
  
  /** @private */
  _getFocusableItem() {
    return this.body && this.body.querySelector('tr[is="coral-table-row"][tabindex="0"]');
  }
  
  /** @private */
  _getFocusableHeaderCell() {
    return this.head && this.head.querySelector('th[is="coral-table-headercell"][tabindex="0"], coral-table-headercell-label[tabindex="0"]');
  }
  
  /** @private */
  _addLastSelectedItem(item) {
    if (this._lastSelectedItems.items.indexOf(item) === -1) {
      this._lastSelectedItems.items.push(item);
    }
    else {
      // Push it at the end
      this._removeLastSelectedItem(item);
      this._addLastSelectedItem(item);
    }
  }
  
  /** @private */
  _removeLastSelectedItem(item) {
    this._lastSelectedItems.items.splice(this._lastSelectedItems.items.indexOf(item), 1);
  }
  
  /** @private */
  _focusItem(item, forceFocus) {
    this._toggleElementTabIndex(item, this._getFocusableItem(), forceFocus);
  }
  
  /** @private */
  _onFocusFirstItem(event) {
    this._focusEdgeItem(event, true);
  }
  
  /** @private */
  _onFocusLastItem(event) {
    this._focusEdgeItem(event, false);
  }
  
  /** @private */
  _onFocusNextItem(event) {
    this._focusSiblingItem(event, true);
  }
  
  /** @private */
  _onFocusPreviousItem(event) {
    this._focusSiblingItem(event, false);
  }
  
  /** @private */
  _onSelectNextItem(event) {
    this._selectSiblingItem(true);
  }
  
  /** @private */
  _onSelectPreviousItem(event) {
    this._selectSiblingItem(false);
  }
  
  /** @private */
  _resetLayout() {
    if (this._preventResetLayout) {
      return;
    }
    
    // Debounce
    if (this._timeout !== null) {
      window.clearTimeout(this._timeout);
    }
    this._timeout = window.setTimeout(function() {
      this._timeout = null;
      this._resizeStickyHead();
      this._resizeContainer();
    }.bind(this), this._wait);
  }
  
  /** @private */
  _resizeStickyHead() {
    const table = this;
    const head = table.head;
    if (head && head.sticky) {
      getRows([head]).forEach(function(row) {
        getHeaderCells(row).forEach(function(headerCell) {
          table._layoutStickyCell(headerCell, true);
        });
      });
    }
  }
  
  /** @private */
  _resizeContainer() {
    const table = this;
    const head = table.head;
    
    if (head && head.sticky) {
      let calculatedHeadSize = 0;
      let previousRowHeight = 0;
      
      // Reset head layout
      getRows([head]).forEach(function(row, i) {
        const headerCells = getHeaderCells(row);
        
        if (headerCells.length) {
          const computedStyle = window.getComputedStyle(headerCells[0].content);
          let rowHeight = 0;
          // Default min-height is 37px
          const stickyHeaderCellMinHeight = parseFloat(computedStyle.minHeight);
          // Divider 'row' or 'cell'  adds a border top
          const borderTopWidth = parseFloat(computedStyle.borderTopWidth);
          
          headerCells.forEach(function(headerCell) {
            // Reset to default
            headerCell.content.style.height = '';
            // The highest header cell defines the row height
            rowHeight = Math.max(rowHeight, headerCell.content.getBoundingClientRect().height);
          });
          
          // Add the row height to the table head height
          calculatedHeadSize += rowHeight;
          
          headerCells.forEach(function(headerCell) {
            // Expand the header cell height to the row height
            if ((rowHeight - borderTopWidth) !== stickyHeaderCellMinHeight) {
              headerCell.content.style.height = rowHeight + 'px';
            }
            
            // @polyfill ie/edge/firefox
            // Vertically align text in sticky cell by getting the label height
            if ((IS_IE_OR_EDGE || IS_FIREFOX) && headerCell.content.textContent.trim().length) {
              const stickyHeaderCellHeight = headerCell.content.getBoundingClientRect().height;
              const span = document.createElement('span');
              
              // Prevents a recursive table relayout that is triggered from changing the header cell content
              table._preventResetLayout = true;
              
              while (headerCell.content.firstChild) {
                span.appendChild(headerCell.content.firstChild);
              }
              headerCell.content.appendChild(span);
              
              const labelHeight = span.getBoundingClientRect().height;
              const paddingTop = (stickyHeaderCellHeight - labelHeight) / 2;
              
              while (span.firstChild) {
                headerCell.content.appendChild(span.firstChild);
              }
              headerCell.content.removeChild(span);
              
              headerCell.content.style.paddingTop = paddingTop + 'px';
              
              window.requestAnimationFrame(function() {
                table._preventResetLayout = false;
              });
            }
            
            // Position the sticky cell
            previousRowHeight = previousRowHeight || rowHeight;
            headerCell.content.style.top = (i > 0 ? (previousRowHeight * i) + (borderTopWidth * (i - 1)) : 0) + 'px';
          });
        }
      });
      
      const containerComputedStyle = window.getComputedStyle(this._elements.container);
      const borderTopWidth = parseFloat(containerComputedStyle.borderTopWidth);
      const borderBottomWidth = parseFloat(containerComputedStyle.borderBottomWidth);
  
      const containerBorderSize = borderTopWidth + borderBottomWidth;
      const containerMarginTop = calculatedHeadSize + 'px';
      const containerHeight = 'calc(100% - ' + (calculatedHeadSize + containerBorderSize) + 'px)';
      this._resetContainerLayout(containerMarginTop, containerHeight);
      
      // Once the sticky table head is properly positioned, we don't need to hide it anymore
      head.classList.remove(IS_HIDDEN);
    }
    else {
      this._resetContainerLayout();
    }
  }
  
  /** @private */
  _resetContainerLayout(marginTop, height) {
    this._elements.container.style.marginTop = marginTop ? marginTop : '';
    this._elements.container.style.height = height ? height : '';
  }
  
  /** @private */
  _resetHiddenColumns() {
    getColumns(this.columns).forEach(function(column) {
      this._syncHiddenColumn(column);
    }, this);
  }
  
  /** @private */
  _onScroll(event) {
    const table = this;
    const head = table.head;
    
    // Ignore if only vertical scroll
    const scrollLeft = table._elements.container.scrollLeft;
    if (table._lastScrollLeft === scrollLeft) {
      return;
    }
    table._lastScrollLeft = scrollLeft;
    
    if (head && head.sticky) {
      // Trigger a reflow that will reposition the sticky cells for FF only.
      head.style.margin = '1px';
      
      window.requestAnimationFrame(function() {
        head.style.margin = '';
        
        // In other browsers e.g Chrome or IE, we need to adjust the position of the sticky cells manually
        if (!table._preventLayoutStickyCellOnScroll) {
          const firstHeaderCell = head.querySelector('tr[is="coral-table-row"] th[is="coral-table-headercell"]');
          
          if (firstHeaderCell) {
            // Verify if the sticky cells need to be adjusted. If the first one didn't move, we can assume that they
            // all need to be adjusted. By default, the left offset is 1px because of the table border.
            if (table._layoutStickyCellOnScroll || firstHeaderCell.content.offsetLeft === 1) {
              table._layoutStickyCellOnScroll = true;
              
              getRows([head]).forEach(function(row) {
                getHeaderCells(row).forEach(function(headerCell) {
                  const paddingLeft = parseFloat(window.getComputedStyle(headerCell).paddingLeft);
                  headerCell.content.style.marginLeft = '-' + (scrollLeft + paddingLeft) + 'px';
                });
              });
            }
            else {
              // We don't need to layout the sticky cells manually
              table._preventLayoutStickyCellOnScroll = true;
            }
          }
        }
      });
    }
  }
  
  /** @private */
  _setHeaderCellScope(headerCell, tableSection) {
    // Add appropriate scope depending on whether header cell is in THEAD or TBODY
    const scope = (tableSection.nodeName === 'THEAD' || tableSection.nodeName === 'TFOOT') ? 'col' : 'row';
    const ariaRole = scope === 'col' ? 'columnheader' : 'rowheader';
    headerCell.setAttribute('role', ariaRole);
    headerCell.setAttribute('scope', scope);
  }
  
  /**  @private */
  _handleMutations(mutations) {
    let resetHiddenColumns = false;
  
    mutations.forEach(function(mutation) {
      // Sync added nodes
      for (let i = 0; i < mutation.addedNodes.length; i++) {
        const addedNode = mutation.addedNodes[i];
      
        resetHiddenColumns = resetHiddenColumns || (addedNode instanceof TableHeaderCell ||
          addedNode instanceof TableCell ||
          addedNode instanceof TableRow ||
          addedNode instanceof TableHead ||
          addedNode instanceof TableBody ||
          addedNode instanceof TableFoot);
      }
    
      // Sync removed nodes
      for (let k = 0; k < mutation.removedNodes.length; k++) {
        const removedNode = mutation.removedNodes[k];

        if (removedNode instanceof TableBody) {
          this._onBodyContentChanged({
            target: removedNode,
            detail: {
              addedNodes: [],
              removedNodes: getRows([removedNode]),
            }
          });
        }
      }
    }, this);
  
    // Sync hidden columns
    if (resetHiddenColumns) {
      this._resetHiddenColumns();
    }
  
    this._resetLayout();
  }
  
  // For backwards compatibility + Torq
  get defaultContentZone() {return this.body;}
  set defaultContentZone(value) {this.body = value;}
  get _contentZones() {
    return {
      'tbody': 'body',
      'thead': 'head',
      'tfoot': 'foot',
      'colgroup': 'columns'
    };
  }
  
  // Expose enums
  static get variant() {return variant;}
  static get divider() {return divider;}
  
  static get observedAttributes() {
    return ['variant', 'selectable', 'orderable', 'multiple', 'lockable'];
  }
  
  connectedCallback() {
    super.connectedCallback();
    
    this.classList.add(CLASSNAME);
  
    // @polyfill ie/edge/firefox
    if (IS_IE_OR_EDGE || IS_FIREFOX) {
      this.classList.add(`${CLASSNAME}--IE`);
    }
    
    // Wrapper should have role="presentation" because it wraps another table
    this.setAttribute('role', 'presentation');
    
    // Default reflected attribute
    if (!this._variant) {this.variant = variant.DEFAULT;}
    
    const head = this._elements.head;
    const body = this._elements.body;
    const foot = this._elements.foot;
    const columns = this._elements.columns;
  
    // Render template
    const frag = document.createDocumentFragment();
    frag.appendChild(this._elements.container);
  
    // Disconnect MO observer while moving table sections around
    this._observer.disconnect();
    
    // Support row only content
    if (!body.parentNode) {
      // Look for the table auto generated table body
      const tableAutoCreatedBody = this.querySelector('tbody');
      if (tableAutoCreatedBody) {
        // Move the rows inside the coral table body
        while (tableAutoCreatedBody.firstChild) {
          body.appendChild(tableAutoCreatedBody.firstChild);
        }
        // Remove the auto generated table body
        tableAutoCreatedBody.remove();
      }
    }
    
    // Call content zone inserts
    this.head = head;
    this.body = body;
    this.foot = foot;
    this.columns = columns;
    
    // cloneNode support
    const wrapper = this.querySelector('.coral-Table-wrapper-container');
    const object = this.querySelector('object');
    
    if (wrapper) {wrapper.remove();}
    if (object && object.parentNode === this) {this.removeChild(object);}
  
    // Append frag
    this.appendChild(frag);
    
    // Reconnect observer
    this._observer.observe(this, {
      childList: true,
      subtree: true
    });
  
    // Set header cell scope
    getRows([this._elements.table]).forEach(function(row) {
      getHeaderCells(row).forEach(function(headerCell) {
        this._setHeaderCellScope(headerCell, row.parentNode);
      }, this);
    }, this);
    
    // Detect table size changes
    commons.addResizeListener(this, this._resetLayout);
    
    // Disable table features if no items.
    const items = getRows([this.body]);
    this._toggleInteractivity(items.length === 0);
  
    // Sync selection state
    if (this.selectable) {
      const selectedItems = this.selectedItems;
    
      // Sync select all handle if any
      this._syncSelectAllHandle(selectedItems, items);
    
      // Sync used collections
      if (selectedItems.length) {
        this._oldSelection = selectedItems;
        this._lastSelectedItems.items = selectedItems;
      }
    }
    
    // Sync sorted
    this._allowSorting = true;
    const column = this._isSorted();
    if (column) {
      column._doSort(true);
    }
  }
  
  /**
   Triggered before a column gets sorted by user interaction. Can be used to cancel column sorting and define
   custom sorting.
   
   @event Coral.Table#coral-table:beforecolumnsort
   
   @param {Object} event
   Event object
   @param {Coral.Table.Column} event.detail.column
   The column to be sorted.
   @param {Coral.Table.Column.sortableDirection} event.detail.direction
   The requested sorting direction for the column.
   */
  
  /**
   Triggered when a column is sorted.
   
   @event Coral.Table#coral-table:columnsort
   
   @param {Object} event
   Event object
   @param {Coral.Table.Column} event.detail.column
   The sorted column.
   */
  
  /**
   Triggered before a column is dragged. Can be used to cancel column dragging.
   
   @event Coral.Table#coral-table:beforecolumndrag
   
   @param {Object} event
   Event object
   @param {Coral.Table.Column} event.detail.column
   The dragged column.
   @param {Coral.Table.Column} event.detail.before
   The column will be inserted before this sibling column.
   If <code>null</code>, the column is inserted at the end.
   */
  
  /**
   Triggered when a column is dragged.
   
   @event Coral.Table#coral-table:columndrag
   
   @param {Object} event
   Event object
   @param {Coral.Table.Column} event.detail.column
   The dragged column.
   @param {Coral.Table.Column} event.detail.oldBefore
   The column next sibling before the swap.
   If <code>null</code>, the column was the last item.
   @param {Coral.Table.Column} event.detail.before
   The column is inserted before this sibling column.
   If <code>null</code>, the column is inserted at the end.
   */
  
  /**
   Triggered before a row is ordered. Can be used to cancel row ordering.
   
   @event Coral.Table#coral-table:beforeroworder
   
   @param {Object} event
   Event object
   @param {Coral.Table.Row} event.detail.row
   The row to be ordered.
   @param {Coral.Table.Row} event.detail.before
   The row will be inserted before this sibling row.
   If <code>null</code>, the row is inserted at the end.
   */
  
  /**
   Triggered when a row is ordered.
   
   @event Coral.Table#coral-table:roworder
   
   @param {Object} event
   Event object
   @param {Coral.Table.Row} event.detail.row
   The ordered row.
   @param {Coral.Table.Row} event.detail.oldBefore
   The row next sibling before the swap.
   If <code>null</code>, the row was the last item.
   @param {Coral.Table.Row} event.detail.before
   The row is inserted before this sibling row.
   If <code>null</code>, the row is inserted at the end.
   */
  
  /**
   Triggered when a row is locked.
   
   @event Coral.Table#coral-table:rowlock
   
   @param {Object} event
   Event object
   @param {Coral.Table.Row} event.detail.row
   The locked row.
   */
  
  /**
   Triggered when a row is locked.
   
   @event Coral.Table#coral-table:rowunlock
   
   @param {Object} event
   Event object
   @param {Coral.Table.Row} event.detail.row
   The unlocked row.
   */
  
  /**
   Triggered when a table row selection changed.
   
   @event Coral.Table#coral-table:rowchange
   
   @param {Object} event
   Event object
   @param {Array.<HTMLElement>} event.detail.oldSelection
   The old item selection. When {@link Coral.Table.Row#multiple}, it includes an Array.
   @param {Array.<HTMLElement>} event.detail.selection
   The item selection. When {@link Coral.Table.Row#multiple}, it includes an Array.
   @param {HTMLElement} event.detail.row
   The targeted row.
   */
  
  /**
   Triggered when the selection changed.
   
   @event Coral.Table#coral-table:change
   
   @param {Object} event
   Event object
   @param {Array.<HTMLElement>} event.detail.oldSelection
   The old item selection. When {@link Coral.Table#multiple}, it includes an Array.
   @param {Array.<HTMLElement>} event.detail.selection
   The item selection. When {@link Coral.Table#multiple}, it includes an Array.
   */
}

export default Table;