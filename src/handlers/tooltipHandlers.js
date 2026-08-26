/**
 * Tooltip Handlers - Handle tooltip positioning and hover states
 * Extracted from App.js handleTooltip, handleTooltipCellMouseOver, etc.
 */

/**
 * Create tooltip handlers
 */
export function createTooltipHandlers(setTooltipData, hoveredTooltipCellRef) {
  
  /**
   * Handle tooltip display request
   */
  function handleTooltip(item, context, value, event) {
    try {
      const currentCell = event?.currentTarget?.closest?.('.tooltipcell');
      if (currentCell) {
        currentCell.classList.remove('tooltipcell-hover');
        if (hoveredTooltipCellRef.current === currentCell) {
          hoveredTooltipCellRef.current = null;
        }
      }
      const { clientX, clientY } = event;
      let bdrag = true;
      if (context === 'trades') bdrag = false;
      if (context === 'username') bdrag = false;
      if (context === 'askIA') bdrag = false;

      setTooltipData({
        x: clientX,
        y: clientY,
        item,
        context,
        value,
        bdrag,
        anchor: event?.currentTarget || null,
      });
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Clear the currently hovered tooltip cell
   */
  function clearHoveredTooltipCell() {
    if (!hoveredTooltipCellRef.current) return;
    hoveredTooltipCellRef.current.classList.remove('tooltipcell-hover');
    hoveredTooltipCellRef.current = null;
  }

  /**
   * Set the hovered tooltip cell
   */
  function setHoveredTooltipCell(cell) {
    if (cell === hoveredTooltipCellRef.current) return;
    clearHoveredTooltipCell();
    if (!cell || !document.body.contains(cell)) return;
    cell.classList.add('tooltipcell-hover');
    hoveredTooltipCellRef.current = cell;
  }

  /**
   * Handle mouse over on tooltip cell
   */
  function handleTooltipCellMouseOver(event) {
    const cell = event.target?.closest?.('.tooltipcell') || null;
    if (!cell) return;
    setHoveredTooltipCell(cell);
  }

  /**
   * Handle mouse out from tooltip cell
   */
  function handleTooltipCellMouseOut(event) {
    const currentCell = event.target?.closest?.('.tooltipcell') || null;
    if (!currentCell || hoveredTooltipCellRef.current !== currentCell) return;
    const nextCell = event.relatedTarget?.closest?.('.tooltipcell') || null;
    if (nextCell === currentCell) return;
    if (nextCell) {
      setHoveredTooltipCell(nextCell);
      return;
    }
    clearHoveredTooltipCell();
  }

  /**
   * Handle copy farm ID with tooltip feedback
   */
  function handleDonClick(address, element) {
    const textarea = document.createElement('textarea');
    textarea.value = address;
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    if (success) {
      const tooltip = document.createElement('div');
      tooltip.classList.add('tooltipfrmid');
      tooltip.textContent = address + ' copied !';
      const rect = element.getBoundingClientRect();
      tooltip.style.top = rect.top + 40 + 'px';
      tooltip.style.left = rect.left - 70 + 'px';
      document.body.appendChild(tooltip);
      setTimeout(() => {
        document.body.removeChild(tooltip);
      }, 2000);
      document.body.removeChild(textarea);
    }
  }

  return {
    handleTooltip,
    handleTooltipCellMouseOver,
    handleTooltipCellMouseOut,
    clearHoveredTooltipCell,
    setHoveredTooltipCell,
    handleDonClick,
  };
}

/**
 * Replays the click which opened a tooltip so its payload is rebuilt from the
 * latest rendered row. This keeps legacy and modern tooltips reactive without
 * running a second page-wide calculation.
 */
export function refreshOpenTooltip(tooltipData) {
  const anchor = tooltipData?.anchor;
  if (!anchor || typeof anchor.dispatchEvent !== 'function' || !document.body.contains(anchor)) {
    return false;
  }
  anchor.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX: Number(tooltipData.x) || 0,
    clientY: Number(tooltipData.y) || 0,
  }));
  return true;
}

export default createTooltipHandlers;
