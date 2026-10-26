"use client";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

interface Variant {
  id: number;
  display_order?: string | number;
}
interface Item {
  name: string;
  design_number?: string;
  price_per_meter: string | number;
  variants: Variant[];
}
interface QRLabelPdfProps {
  item: Item;
  qrImages: Record<number, string>;
  id?: string;
}

const styles = StyleSheet.create({
  page: {
    width: 85.04,
    height: 141.73,
    padding: 4,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: "#fff",
  },
  name: {
    fontSize: 8,
    fontWeight: 800,
    textAlign: "center",
    maxLines: 2,
    textOverflow: "ellipsis",
  },
  design: {
    fontSize: 7,
    fontWeight: 600,
    color: "#444",
    textAlign: "center",
    maxLines: 1,
    textOverflow: "ellipsis",
  },
  variant: {
    fontSize: 7,
    padding: 2,
    fontWeight: 600,
    textAlign: "center",
    maxLines: 1,
    textOverflow: "ellipsis",
  },
  price: {
    fontSize: 9,
    fontWeight: 800,
  },
  qr: {
    width: 56,
    height: 56,
  },
});

export const QRLabelPdf = ({ item, qrImages }: QRLabelPdfProps) => (
  <Document>
    {item.variants.map((variant) => {
      return (
        <Page
          key={variant.id}
          size={[85.04, 141.73]}
          style={styles.page}
        >
          <Text style={styles.name}>{item.name}</Text>
          {item.design_number ? (
            <Text style={styles.design}>Design: {item.design_number}</Text>
          ) : null}
          <Text style={styles.variant}>
            {variant.display_order
              ? `Color #${variant.display_order}`
              : `Color #${variant.id}`}
          </Text>
          <View>
            {/* eslint-disable-next-line*/}
            <Image src={qrImages[variant.id]} style={styles.qr} />
          </View>
          <Text style={styles.price}>
            Rs. {Number(item.price_per_meter).toFixed(2)}/m
          </Text>
        </Page>
      );
    })}
  </Document>
);
