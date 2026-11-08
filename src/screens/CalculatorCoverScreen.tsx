import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUTTON_GAP = 12;
const BUTTON_SIZE = Math.floor((SCREEN_WIDTH - 32 - BUTTON_GAP * 3) / 4);

interface CalculationHistoryItem {
  id: string;
  expression: string;
  result: string;
  note?: string;
  timestamp: number;
}

const INITIAL_MOCK_HISTORY: CalculationHistoryItem[] = [
  { id: 'hist_1', expression: '380 + 120', result: '500', note: '早餐咖啡與三明治', timestamp: Date.now() - 3600000 * 2 },
  { id: 'hist_2', expression: '1250 × 0.85', result: '1062.5', note: '特價運動衣物', timestamp: Date.now() - 3600000 * 5 },
  { id: 'hist_3', expression: '2400 ÷ 4', result: '600', note: '週末聚餐分攤', timestamp: Date.now() - 3600000 * 18 },
  { id: 'hist_4', expression: '45000 × 0.05', result: '2250', note: '進銷發票營業稅', timestamp: Date.now() - 3600000 * 26 },
  { id: 'hist_5', expression: '780 + 450 + 320', result: '1550', note: '超市生活用品', timestamp: Date.now() - 3600000 * 48 },
];

export const CalculatorCoverScreen: React.FC = () => {
  const { settings, setCurrentScreen, setIsDecoyMode } = useApp();

  // Calculator Engine State
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [isWaitingForNextOperand, setIsWaitingForNextOperand] = useState<boolean>(false);
  const [subExpression, setSubExpression] = useState<string>('');

  // History Drawer State
  const [isHistoryVisible, setIsHistoryVisible] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<CalculationHistoryItem[]>(INITIAL_MOCK_HISTORY);

  // Stealth Transition Animation
  const [fadeAnim] = useState(() => new Animated.Value(1));

  // Format number for display with commas
  const formatDisplay = (val: string): string => {
    if (val === '錯誤' || val === 'NaN' || val === 'Infinity') return '錯誤';
    const parts = val.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
  };

  const getFontSize = (val: string): number => {
    const len = val.length;
    if (len > 9) return 36;
    if (len > 7) return 46;
    if (len > 5) return 58;
    return 68;
  };

  const triggerKeyHaptic = () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  // Perform stealth transition to unlocked mode
  const executeStealthUnlock = (isDecoy: boolean) => {
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    if (isDecoy) {
      setIsDecoyMode(true);
    } else {
      setIsDecoyMode(false);
    }

    // 150ms imperceptible seamless fade-out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentScreen('main');
    });
  };

  // Number Input Handler
  const handleDigit = (digit: string) => {
    triggerKeyHaptic();

    if (isWaitingForNextOperand) {
      setDisplayValue(digit);
      setIsWaitingForNextOperand(false);
    } else {
      if (displayValue === '0' && digit !== '.') {
        setDisplayValue(digit);
      } else {
        if (displayValue.length >= 10) return; // Limit digits
        setDisplayValue(displayValue + digit);
      }
    }
  };

  // Decimal Point
  const handleDecimal = () => {
    triggerKeyHaptic();
    if (isWaitingForNextOperand) {
      setDisplayValue('0.');
      setIsWaitingForNextOperand(false);
      return;
    }
    if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  };

  // Clear / All Clear
  const handleClear = () => {
    triggerKeyHaptic();
    setDisplayValue('0');
    setPreviousValue(null);
    setOperator(null);
    setIsWaitingForNextOperand(false);
    setSubExpression('');
  };

  // Toggle Sign (+/-)
  const handleToggleSign = () => {
    triggerKeyHaptic();
    if (displayValue === '0' || displayValue === '錯誤') return;
    if (displayValue.startsWith('-')) {
      setDisplayValue(displayValue.substring(1));
    } else {
      setDisplayValue('-' + displayValue);
    }
  };

  // Percentage (%)
  const handlePercentage = () => {
    triggerKeyHaptic();
    const current = parseFloat(displayValue);
    if (isNaN(current)) return;
    const result = current / 100;
    setDisplayValue(String(result));
  };

  // Operator (+, -, ×, ÷)
  const handleOperator = (nextOperator: string) => {
    triggerKeyHaptic();
    const inputValue = parseFloat(displayValue);

    if (previousValue === null) {
      setPreviousValue(inputValue);
      setSubExpression(`${displayValue} ${nextOperator}`);
    } else if (operator && !isWaitingForNextOperand) {
      const result = computeResult(previousValue, inputValue, operator);
      setPreviousValue(result);
      setDisplayValue(String(result));
      setSubExpression(`${result} ${nextOperator}`);
    } else {
      setSubExpression(`${previousValue} ${nextOperator}`);
    }

    setOperator(nextOperator);
    setIsWaitingForNextOperand(true);
  };

  // Compute arithmetic
  const computeResult = (prev: number, current: number, op: string): number => {
    switch (op) {
      case '+':
        return prev + current;
      case '-':
        return prev - current;
      case '×':
        return prev * current;
      case '÷':
        return current === 0 ? NaN : prev / current;
      default:
        return current;
    }
  };

  // Equals (=) Handler - With Stealth Passcode Check
  const handleEquals = () => {
    triggerKeyHaptic();

    // 1. Check Passcode Match
    const masterPin = settings.masterPin || '1314';
    const decoyPin = settings.decoyPin || '9999';

    if (displayValue === masterPin) {
      executeStealthUnlock(false);
      return;
    }

    if (displayValue === decoyPin) {
      executeStealthUnlock(true);
      return;
    }

    // 2. Normal Calculation Routine
    if (operator === null || previousValue === null) {
      return;
    }

    const current = parseFloat(displayValue);
    const resultNum = computeResult(previousValue, current, operator);

    let resultStr = '錯誤';
    if (!isNaN(resultNum) && isFinite(resultNum)) {
      resultStr = String(Math.round(resultNum * 10000000) / 10000000);
    }

    const expr = `${previousValue} ${operator} ${displayValue}`;

    // Append to calculation history
    setHistoryList((prev) => [
      {
        id: `calc_${Date.now()}`,
        expression: expr,
        result: resultStr,
        timestamp: Date.now(),
      },
      ...prev,
    ]);

    setSubExpression(`${expr} =`);
    setDisplayValue(resultStr);
    setPreviousValue(null);
    setOperator(null);
    setIsWaitingForNextOperand(true);
  };

  const handleSelectHistoryItem = (item: CalculationHistoryItem) => {
    triggerKeyHaptic();
    setDisplayValue(item.result);
    setSubExpression(`${item.expression} =`);
    setIsHistoryVisible(false);
  };

  const renderHistoryItem = ({ item }: { item: CalculationHistoryItem }) => (
    <TouchableOpacity
      style={styles.historyItemCard}
      activeOpacity={0.7}
      onPress={() => handleSelectHistoryItem(item)}
    >
      <View style={styles.historyItemTop}>
        <Text style={styles.historyExpression}>{item.expression}</Text>
        {item.note && <Text style={styles.historyNote}>{item.note}</Text>}
      </View>
      <Text style={styles.historyResult}>= {item.result}</Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header / History Button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.historyIconBtn}
            activeOpacity={0.7}
            onPress={() => {
              triggerKeyHaptic();
              setIsHistoryVisible(true);
            }}
          >
            <Ionicons name="time-outline" size={24} color="#A5A5A5" />
          </TouchableOpacity>
        </View>

        {/* Display Area */}
        <View style={styles.displayContainer}>
          {subExpression ? (
            <Text style={styles.subExpressionText} numberOfLines={1}>
              {subExpression}
            </Text>
          ) : (
            <View style={{ height: 20 }} />
          )}
          <Text
            style={[styles.displayText, { fontSize: getFontSize(displayValue) }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatDisplay(displayValue)}
          </Text>
        </View>

        {/* Keypad Matrix (iOS Calculator Layout) */}
        <View style={styles.keypad}>
          {/* Row 1 */}
          <View style={styles.keypadRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnFunction]}
              activeOpacity={0.6}
              onPress={handleClear}
            >
              <Text style={[styles.btnText, styles.btnTextFunction]}>
                {displayValue !== '0' || previousValue !== null ? 'C' : 'AC'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnFunction]}
              activeOpacity={0.6}
              onPress={handleToggleSign}
            >
              <Text style={[styles.btnText, styles.btnTextFunction]}>+/-</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnFunction]}
              activeOpacity={0.6}
              onPress={handlePercentage}
            >
              <Text style={[styles.btnText, styles.btnTextFunction]}>%</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnOperator,
                operator === '÷' && isWaitingForNextOperand && styles.btnOperatorActive,
              ]}
              activeOpacity={0.6}
              onPress={() => handleOperator('÷')}
            >
              <Text
                style={[
                  styles.btnText,
                  styles.btnTextOperator,
                  operator === '÷' && isWaitingForNextOperand && styles.btnTextOperatorActive,
                ]}
              >
                ÷
              </Text>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View style={styles.keypadRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnNumber]}
              activeOpacity={0.6}
              onPress={() => handleDigit('7')}
            >
              <Text style={styles.btnText}>7</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnNumber]}
              activeOpacity={0.6}
              onPress={() => handleDigit('8')}
            >
              <Text style={styles.btnText}>8</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnNumber]}
              activeOpacity={0.6}
              onPress={() => handleDigit('9')}
            >
              <Text style={styles.btnText}>9</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnOperator,
                operator === '×' && isWaitingForNextOperand && styles.btnOperatorActive,
              ]}
              activeOpacity={0.6}
              onPress={() => handleOperator('×')}
            >
              <Text
                style={[
                  styles.btnText,
                  styles.btnTextOperator,
                  operator === '×' && isWaitingForNextOperand && styles.btnTextOperatorActive,
                ]}
              >
                ×
              </Text>
            </TouchableOpacity>
          </View>

          {/* Row 3 */}
          <View style={styles.keypadRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnNumber]}
              activeOpacity={0.6}
              onPress={() => handleDigit('4')}
            >
              <Text style={styles.btnText}>4</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnNumber]}
              activeOpacity={0.6}
              onPress={() => handleDigit('5')}
            >
              <Text style={styles.btnText}>5</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnNumber]}
              activeOpacity={0.6}
              onPress={() => handleDigit('6')}
            >
              <Text style={styles.btnText}>6</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnOperator,
                operator === '-' && isWaitingForNextOperand && styles.btnOperatorActive,
              ]}
              activeOpacity={0.6}
              onPress={() => handleOperator('-')}
            >
              <Text
                style={[
                  styles.btnText,
                  styles.btnTextOperator,
                  operator === '-' && isWaitingForNextOperand && styles.btnTextOperatorActive,
                ]}
              >
                -
              </Text>
            </TouchableOpacity>
          </View>

          {/* Row 4 */}
          <View style={styles.keypadRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnNumber]}
              activeOpacity={0.6}
              onPress={() => handleDigit('1')}
            >
              <Text style={styles.btnText}>1</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnNumber]}
              activeOpacity={0.6}
              onPress={() => handleDigit('2')}
            >
              <Text style={styles.btnText}>2</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnNumber]}
              activeOpacity={0.6}
              onPress={() => handleDigit('3')}
            >
              <Text style={styles.btnText}>3</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnOperator,
                operator === '+' && isWaitingForNextOperand && styles.btnOperatorActive,
              ]}
              activeOpacity={0.6}
              onPress={() => handleOperator('+')}
            >
              <Text
                style={[
                  styles.btnText,
                  styles.btnTextOperator,
                  operator === '+' && isWaitingForNextOperand && styles.btnTextOperatorActive,
                ]}
              >
                +
              </Text>
            </TouchableOpacity>
          </View>

          {/* Row 5 */}
          <View style={styles.keypadRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnNumber, styles.btnZero]}
              activeOpacity={0.6}
              onPress={() => handleDigit('0')}
            >
              <Text style={[styles.btnText, styles.btnTextZero]}>0</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnNumber]}
              activeOpacity={0.6}
              onPress={handleDecimal}
            >
              <Text style={styles.btnText}>.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnOperator]}
              activeOpacity={0.6}
              onPress={handleEquals}
            >
              <Text style={[styles.btnText, styles.btnTextOperator]}>=</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Mock Calculation History Drawer */}
      <Modal
        visible={isHistoryVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsHistoryVisible(false)}
      >
        <View style={styles.historyModalOverlay}>
          <View style={styles.historyDrawer}>
            <View style={styles.historyHeader}>
              <View style={styles.historyHeaderLeft}>
                <Ionicons name="receipt-outline" size={20} color="#60A5FA" />
                <Text style={styles.historyTitle}>計算紀錄</Text>
              </View>
              <View style={styles.historyHeaderActions}>
                <TouchableOpacity
                  style={styles.clearHistoryBtn}
                  onPress={() => {
                    triggerKeyHaptic();
                    setHistoryList([]);
                  }}
                >
                  <Text style={styles.clearHistoryText}>清除</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeHistoryBtn}
                  onPress={() => {
                    triggerKeyHaptic();
                    setIsHistoryVisible(false);
                  }}
                >
                  <Ionicons name="close-circle" size={26} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {historyList.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Text style={styles.historyEmptyText}>無任何計算歷史</Text>
              </View>
            ) : (
              <FlatList
                data={historyList}
                keyExtractor={(item) => item.id}
                renderItem={renderHistoryItem}
                contentContainerStyle={styles.historyList}
              />
            )}
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  historyIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#1E1E1E',
  },
  displayContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    minHeight: 120,
  },
  subExpressionText: {
    color: '#71717A',
    fontSize: 20,
    fontWeight: '400',
    marginBottom: 6,
  },
  displayText: {
    color: '#FFFFFF',
    fontWeight: '300',
    textAlign: 'right',
  },
  keypad: {
    gap: BUTTON_GAP,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: BUTTON_GAP,
  },
  btn: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnNumber: {
    backgroundColor: '#333333',
  },
  btnFunction: {
    backgroundColor: '#A5A5A5',
  },
  btnOperator: {
    backgroundColor: '#FF9F0A',
  },
  btnOperatorActive: {
    backgroundColor: '#FFFFFF',
  },
  btnZero: {
    width: BUTTON_SIZE * 2 + BUTTON_GAP,
    alignItems: 'flex-start',
    paddingLeft: BUTTON_SIZE * 0.35,
  },
  btnText: {
    fontSize: 32,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  btnTextFunction: {
    color: '#000000',
  },
  btnTextOperator: {
    color: '#FFFFFF',
    fontSize: 34,
  },
  btnTextOperatorActive: {
    color: '#FF9F0A',
  },
  btnTextZero: {
    paddingLeft: 6,
  },

  // History Drawer Modal
  historyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  historyDrawer: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '65%',
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#27272A',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  historyHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clearHistoryBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearHistoryText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '600',
  },
  closeHistoryBtn: {
    padding: 2,
  },
  historyList: {
    paddingTop: 12,
    gap: 10,
  },
  historyItemCard: {
    backgroundColor: '#27272A',
    borderRadius: 14,
    padding: 14,
  },
  historyItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyExpression: {
    color: '#A1A1AA',
    fontSize: 15,
  },
  historyNote: {
    color: '#60A5FA',
    fontSize: 12,
    backgroundColor: 'rgba(96, 165, 250, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyResult: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'right',
  },
  historyEmpty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  historyEmptyText: {
    color: '#71717A',
    fontSize: 14,
  },
});
