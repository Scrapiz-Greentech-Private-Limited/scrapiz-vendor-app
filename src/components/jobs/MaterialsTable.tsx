import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../../theme/tokens';
import { BookingActiveOrderItem, SelectedPickupItem } from '../../types';

export interface MaterialsTableProps {
  items: (BookingActiveOrderItem | SelectedPickupItem)[];
  title?: string;
}

export const MaterialsTable: React.FC<MaterialsTableProps> = ({
  items,
  title = 'Materials in this pickup',
}) => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerTitleRow}>
        <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        <Text style={styles.countBadge} numberOfLines={1} ellipsizeMode="tail">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      {/* Table Header Row */}
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.thText, styles.colMaterial]} numberOfLines={1} ellipsizeMode="tail">
          MATERIAL
        </Text>
        <Text style={[styles.thText, styles.colQty]} numberOfLines={1} ellipsizeMode="tail">
          QTY
        </Text>
        <Text style={[styles.thText, styles.colUnit]} numberOfLines={1} ellipsizeMode="tail">
          UNIT
        </Text>
        <Text style={[styles.thText, styles.colRate]} numberOfLines={1} ellipsizeMode="tail">
          RATE
        </Text>
      </View>

      {/* Table Body Rows */}
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="cube-outline" size={32} color={DESIGN_TOKENS.TEXT_MUTED} />
          <Text style={styles.emptyText} numberOfLines={1} ellipsizeMode="tail">
            No items listed for this pickup
          </Text>
        </View>
      ) : (
        items.map((item: any, index) => {
          const isEven = index % 2 === 0;
          const name = item.product_name || item.name || item.title || 'Scrap Material';
          const qty = Number(item.quantity ?? item.approximate_weight ?? 1);
          const unit = item.unit || 'kg';
          const rate = Number(item.rate_per_unit ?? item.price_per_unit ?? item.rate ?? 0);
          const imageUrl = item.image_url || item.product?.image_url;

          return (
            <View
              key={String(item.product_id || item.id || index)}
              style={[
                styles.dataRow,
                { backgroundColor: isEven ? '#F8FAFC' : '#FFFFFF' },
              ]}
            >
              {/* Material Column: Image + Name */}
              <View style={styles.materialCell}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.productImg} resizeMode="cover" />
                ) : (
                  <View style={styles.imgPlaceholder}>
                    <MaterialCommunityIcons name="recycle" size={20} color={DESIGN_TOKENS.GREEN_MID} />
                  </View>
                )}
                <Text style={styles.materialName} numberOfLines={2} ellipsizeMode="tail">
                  {name}
                </Text>
              </View>

              {/* QTY Column */}
              <View style={styles.qtyCell}>
                <Text style={styles.qtyText} numberOfLines={1} ellipsizeMode="tail">
                  {qty.toFixed(2)}
                </Text>
              </View>

              {/* UNIT Column */}
              <View style={styles.unitCell}>
                <Text style={styles.unitText} numberOfLines={1} ellipsizeMode="tail">
                  {unit}
                </Text>
              </View>

              {/* RATE Column */}
              <View style={styles.rateCell}>
                <Text style={styles.rateText} numberOfLines={1} ellipsizeMode="tail">
                  ₹{rate.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: DESIGN_TOKENS.CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.BORDER,
    padding: 16,
    minHeight: 180,
    shadowColor: DESIGN_TOKENS.GREEN_DARK,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN_TOKENS.TEXT_PRIMARY,
  },
  countBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.TEXT_SECONDARY,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.BORDER,
  },
  thText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.TEXT_SECONDARY,
    letterSpacing: 0.6,
  },
  colMaterial: {
    flex: 4,
    paddingLeft: 4,
  },
  colQty: {
    flex: 2,
    textAlign: 'center',
  },
  colUnit: {
    flex: 1.8,
    textAlign: 'center',
  },
  colRate: {
    flex: 2.2,
    textAlign: 'right',
    paddingRight: 4,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    marginVertical: 1,
  },
  materialCell: {
    flex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 6,
  },
  productImg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  imgPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.GREEN_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN_TOKENS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  qtyCell: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN_TOKENS.TEXT_PRIMARY,
  },
  unitCell: {
    flex: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitText: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN_TOKENS.TEXT_SECONDARY,
  },
  rateCell: {
    flex: 2.2,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 4,
  },
  rateText: {
    fontSize: 15,
    fontWeight: '800',
    color: DESIGN_TOKENS.GREEN_DARK,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: DESIGN_TOKENS.TEXT_MUTED,
  },
});

export default MaterialsTable;
