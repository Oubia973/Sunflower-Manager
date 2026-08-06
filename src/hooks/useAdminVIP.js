/**
 * useAdminVIP Hook - Admin and VIP payment flow management
 * Extracted from App.js handleAdminClick, handleVipClick, etc.
 */

import { useState, useCallback } from 'react';
import { imgusdc, imgmatic, imgbase, imgeth, imgsfl } from '../constants/images.js';
import { formatVipPromptMessage } from '../utils/formatting.js';
import { fetchJson } from '../services/apiClient.js';

/**
 * Hook for admin and VIP functionality
 */
export function useAdminVIP(API_URL, dataSetFarm, dataSet, promptPass, promptChoice, promptInfo, promptInput) {
  const [adminData, setAdminData] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [vipLoading, setVipLoading] = useState(false);

  /**
   * Fetch admin view data
   */
  const fetchAdminView = useCallback(async (payload = {}, allowPrompt = true) => {
    const isAboListRequest = String(payload?.action || '') === 'getabolist';
    const endpoint = isAboListRequest ? '/getabolist' : '/getadminstats';
    const requestInit = isAboListRequest
      ? { method: 'GET', credentials: 'include' }
      : {
          method: 'POST',
          credentials: 'include',
          body: payload || {},
        };

    const requestAdminData = () => fetchJson(API_URL, endpoint, requestInit);
    try {
      return await requestAdminData();
    } catch (error) {
      if (error?.status !== 401 || !allowPrompt || !promptPass) throw error;
      const password = await promptPass();
      if (password === null) {
        throw new Error('Admin login cancelled');
      }
      await fetchJson(API_URL, '/admin/login', {
        method: 'POST',
        credentials: 'include',
        body: { password },
      });
      return await requestAdminData();
    }
  }, [API_URL, promptPass]);

  /**
   * Request VIP payment
   */
  const requestVipPayment = useCallback(async ({ farmId, username, isAbo, vipExpiresAt, tokenSymbol, chainKey }) => {
    return await fetchJson(API_URL, '/request-payment', {
      method: 'POST',
      credentials: 'include',
      body: {
        farmId: Number(farmId || 0),
        username: String(username || ''),
        isAbo: !!isAbo,
        vipExpiresAt: vipExpiresAt || null,
        tokenSymbol: String(tokenSymbol || 'USDC').toUpperCase(),
        chainKey: String(chainKey || 'polygon').toLowerCase(),
      },
    });
  }, [API_URL]);

  /**
   * Confirm VIP payment
   */
  const confirmVipPayment = useCallback(async ({ paymentId, txHash }) => {
    return await fetchJson(API_URL, '/confirm-payment', {
      method: 'POST',
      credentials: 'include',
      body: {
        paymentId: String(paymentId || ''),
        txHash: String(txHash || ''),
      },
    });
  }, [API_URL]);

  /**
   * Handle VIP click - full payment flow
   */
  const handleVipClick = useCallback(async (handleButtonClick) => {
    const farmId = Number(dataSetFarm?.frmid || dataSet?.options?.farmId || 0);
    if (!farmId || farmId === 1972) return;

    const username = String(dataSet?.options?.username || dataSetFarm?.username || '');
    const isAbo = !!dataSet?.options?.isAbo;
    const aboExpiresAt = dataSet?.aboExpiresAt || dataSetFarm?.aboExpiresAt || 0;

    const action = await promptChoice(
      formatVipPromptMessage({ farmId, username, isAbo, aboExpiresAt }),
      'VIP',
      [
        { value: 'usdc_polygon', label: 'USDC Polygon', primary: true, iconSrc: imgusdc, labelIconSrc: imgmatic },
        { value: 'usdc_base', label: 'USDC Base', iconSrc: imgusdc, labelIconSrc: imgbase },
        { value: 'eth_base', label: 'ETH Base', iconSrc: imgeth, labelIconSrc: imgbase },
        { value: 'flower_base', label: 'FLOWER Base', iconSrc: imgsfl, labelIconSrc: imgbase },
        { value: 'close', label: 'Close' },
      ],
      { closeOnBackdrop: false }
    );

    if (!['usdc_polygon', 'usdc_base', 'eth_base', 'flower_base'].includes(action)) return;

    try {
      setVipLoading(true);
      
      const paymentChoice = action === 'flower_base'
        ? { tokenSymbol: 'FLOWER', chainKey: 'base' }
        : action === 'eth_base'
          ? { tokenSymbol: 'ETH', chainKey: 'base' }
          : action === 'usdc_base'
            ? { tokenSymbol: 'USDC', chainKey: 'base' }
            : { tokenSymbol: 'USDC', chainKey: 'polygon' };

      const responseData = await requestVipPayment({
        farmId, username, isAbo, vipExpiresAt: aboExpiresAt,
        tokenSymbol: paymentChoice.tokenSymbol,
        chainKey: paymentChoice.chainKey,
      });

      const paymentAction = await promptChoice(
        String(responseData?.message || `Payment request sent for farm ${farmId}.`),
        'VIP',
        [
          { value: 'paid', label: `I donated on ${responseData?.chainLabel || 'Polygon'}`, primary: true },
          { value: 'close', label: 'Close' },
        ],
        { closeOnBackdrop: false }
      );

      if (paymentAction !== 'paid') return;

      const txHash = await promptInput(
        `Paste the ${(responseData?.chainLabel || 'PolygonScan')} link or the transaction hash.`,
        'VIP',
        `0x... or ${(responseData?.explorerBaseUrl || 'https://polygonscan.com')}/tx/...`,
        '',
        'Validate',
        'Cancel',
        { closeOnBackdrop: false }
      );

      if (txHash === null) return;

      const confirmation = await confirmVipPayment({
        paymentId: responseData?.paymentId,
        txHash,
      });

      dataSet.options.isAbo = true;
      dataSet.aboExpiresAt = confirmation?.expiresAt || dataSet.aboExpiresAt || 0;

      try {
        await handleButtonClick('manualLoad');
      } catch {
        // Keep confirmation visible even if refresh fails
      }

      await promptInfo(
        String(confirmation?.message || `Payment confirmed for farm ${farmId}.`),
        'VIP',
        'Close',
        { closeOnBackdrop: false }
      );
    } catch (error) {
      const msg = String(error?.message || 'VIP error');
      await promptInfo(msg, 'VIP', 'Close', { closeOnBackdrop: false });
    } finally {
      setVipLoading(false);
    }
  }, [dataSetFarm, dataSet, promptChoice, promptInfo, promptInput, requestVipPayment, confirmVipPayment]);

  return {
    adminData,
    adminLoading,
    vipLoading,
    fetchAdminView,
    requestVipPayment,
    confirmVipPayment,
    handleVipClick,
    setAdminData,
    setAdminLoading,
    setVipLoading,
  };
}

export default useAdminVIP;
