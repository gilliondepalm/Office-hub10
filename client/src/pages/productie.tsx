import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart,
} from "recharts";
import { PageHero } from "@/components/page-hero";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { isAdminRole } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Upload, Download, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { KartografieProductie } from "@shared/schema";

const JAREN = Array.from({ length: 30 }, (_, i) => String(1996 + i));
const LANDMETERS_JAREN = Array.from({ length: 31 }, (_, i) => String(1995 + i));

type KartografieRij = { jaar: string; binnengekomen: number; afgehandeld: number; gemiddeld: number; kartografen: number };
type LandmetersRij = { jaar: string; binnengekomen: number; afgehandeld: number; uitbesteding: number; gemiddeld: number; landmeters: number };

const KARTOGRAFIE_DATA: Record<string, KartografieRij[]> = {
  "Jan": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [60,66,88,11,88,52,102,66,53,54,35,101,98,73,118,57,82,74,51,51,51,51,80,44,65,74,58,129,117,158][i],
    afgehandeld:   [90,88,50,11,77,66,73,92,51,48,32,127,74,65,80,54,71,84,85,85,45,24,82,89,81,72,76,61,123,157][i],
    gemiddeld:     [300.0,176.0,100.0,27.5,192.5,220.0,243.3,460.0,170.0,240.0,160.0,635.0,370.0,325.0,400.0,270.0,355.0,420.0,425.0,425.0,225,120.0,410.0,445.0,405.0,360.0,380.0,305.0,615.0,785.0][i],
    kartografen:   [3,5,5,4,4,3,3,2,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2][i],
  })),
  "Feb": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [233,151,391,50,149,130,193,136,112,120,154,206,216,177,322,122,196,175,133,122,111,107,166,123,154,153,185,217,211,287][i],
    afgehandeld:   [129,198,189,50,108,145,177,143,104,107,115,197,173,187,275,119,124,146,178,160,115,99,150,188,144,101,116,136,231,300][i],
    gemiddeld:     [215.0,198.0,189.0,62.5,135.0,241.7,295.0,286.0,173.3,267.5,287.5,492.5,346.0,467.5,687.5,297.5,310.0,365.0,445.0,400.0,287.5,247.5,375.0,470.0,360.0,252.5,290.0,340.0,577.5,750.0][i],
    kartografen:   [6,10,10,8,8,6,6,5,6,4,4,4,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4][i],
  })),
  "Mrt": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [370,210,543,116,245,237,293,234,177,168,333,315,337,328,461,193,262,278,234,212,190,192,247,239,263,170,274,328,358,463][i],
    afgehandeld:   [237,240,544,116,220,225,261,256,190,134,235,359,306,338,437,183,185,255,280,262,212,212,274,277,272,156,361,310,439,458][i],
    gemiddeld:     [263.3,160.0,362.7,96.7,183.3,250.0,290.0,320.0,211.1,223.3,391.7,598.3,382.5,563.3,728.3,305.0,308.3,425.0,466.7,436.7,353.3,353.3,456.7,461.7,453.3,260.0,601.7,516.7,731.7,763.3][i],
    kartografen:   [9,15,15,12,12,9,9,8,9,6,6,6,8,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6][i],
  })),
  "Apr": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [512,258,685,153,300,326,363,234,177,309,333,494,501,415,542,270,365,359,308,286,261,298,368,239,263,239,498,502,536,620][i],
    afgehandeld:   [300,367,585,153,294,320,325,343,235,263,365,403,456,406,533,259,217,406,352,345,285,302,384,277,272,233,480,464,619,692][i],
    gemiddeld:     [250.0,183.5,292.5,95.6,183.8,266.7,270.8,285.8,213.6,292.2,456.3,503.8,456.0,507.5,666.3,323.8,271.3,507.5,440.0,431.3,356.3,377.5,480.0,346.3,340.0,291.3,600.0,580.0,773.8,865.0][i],
    kartografen:   [12,20,20,16,16,12,12,12,11,9,8,8,10,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8][i],
  })),
  "Mei": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [604,360,893,173,403,399,433,320,305,409,403,861,713,534,665,347,500,481,365,364,320,366,493,239,342,304,559,712,650,815][i],
    afgehandeld:   [412,553,761,173,407,396,394,403,338,357,464,592,643,518,636,323,299,474,445,428,356,372,522,277,322,295,547,607,786,782][i],
    gemiddeld:     [274.7,221.2,304.4,86.5,203.5,264.0,262.7,268.7,260.0,297.5,421.8,538.2,535.8,518.0,636.0,323.0,299.0,474.0,445.0,428.0,356.0,372.0,522.0,277.0,322.0,295.0,547.0,607.0,786.0,782.0][i],
    kartografen:   [15,25,25,20,20,15,15,15,13,12,11,11,12,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10][i],
  })),
  "Jun": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1010,450,951,391,493,486,540,423,389,520,503,1124,877,729,758,423,617,635,462,430,399,445,613,239,369,387,681,836,810,921][i],
    afgehandeld:   [460,690,844,391,484,485,451,503,448,437,561,979,749,670,723,397,452,559,561,502,459,501,654,277,533,449,694,885,862,990][i],
    gemiddeld:     [255.6,230.0,281.3,162.9,210.4,269.4,250.6,279.4,298.7,312.1,400.7,699.3,499.3,558.3,602.5,330.8,376.7,465.8,510.0,418.3,382.5,417.5,545.0,230.8,444.2,374.2,578.3,737.5,718.3,825.0][i],
    kartografen:   [18,30,30,24,23,18,18,18,15,14,14,14,15,12,12,12,12,12,11,12,12,12,12,12,12,12,12,12,12,12][i],
  })),
  "Jul": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1106,515,1035,481,563,598,596,493,449,576,620,1343,1128,825,913,483,704,786,562,510,477,559,727,239,611,529,794,957,957,1108][i],
    afgehandeld:   [535,835,1107,481,545,605,530,587,495,523,665,1275,904,830,896,488,638,687,632,613,540,613,747,277,693,577,849,1000,1037,1183][i],
    gemiddeld:     [254.8,238.6,316.3,171.8,209.6,288.1,265.0,279.5,291.2,326.9,415.6,750.0,502.2,592.9,597.3,348.6,455.7,490.7,486.2,437.9,385.7,437.9,533.6,197.9,495.0,412.1,606.4,714.3,740.7,845.0][i],
    kartografen:   [21,35,35,28,26,21,20,21,17,16,16,17,18,14,15,14,14,14,13,14,14,14,14,14,14,14,14,14,14,14][i],
  })),
  "Aug": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1205,589,1236,523,649,665,635,561,525,646,759,1550,1380,1052,1028,522,815,862,619,588,536,676,832,239,736,645,925,1029,1066,1247][i],
    afgehandeld:   [594,898,1295,523,625,668,556,659,566,616,811,1472,1185,1024,1044,565,735,870,725,696,611,730,884,277,811,708,989,1119,1131,1285][i],
    gemiddeld:     [237.6,224.5,323.8,163.4,223.2,278.3,252.7,274.6,297.9,324.2,426.8,736.0,564.3,640.0,614.1,353.1,459.4,543.8,483.3,435.0,381.9,456.3,552.5,173.1,506.9,442.5,618.1,699.4,706.9,803.1][i],
    kartografen:   [25,40,40,32,28,24,22,24,19,19,19,20,21,16,17,16,16,16,15,16,16,16,16,16,16,16,16,16,16,16][i],
  })),
  "Sep": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1313,728,1345,563,729,726,690,618,601,752,850,1721,1628,1185,1098,637,908,947,716,654,615,776,948,239,851,769,1018,1222,1169,1392][i],
    afgehandeld:   [664,1097,1483,563,711,718,583,732,667,700,888,1677,1301,1131,1169,679,810,936,841,770,714,822,991,277,926,813,1090,1460,1297,1453][i],
    gemiddeld:     [221.3,243.8,329.6,156.4,237.0,287.2,253.5,271.1,317.6,333.3,422.9,762.3,542.1,628.3,615.3,377.2,450.0,520.0,494.7,427.8,375.8,456.7,550.6,153.9,514.4,451.7,605.6,811.1,720.6,807.2][i],
    kartografen:   [30,45,45,36,30,25,23,27,21,21,21,22,24,18,19,18,18,18,17,18,19,18,18,18,18,18,18,18,18,18][i],
  })),
  "Okt": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1512,1022,1493,619,855,799,754,674,704,841,966,1894,1727,1292,1222,703,974,1044,816,734,693,776,1054,239,965,914,1177,1609,1288,1517][i],
    afgehandeld:   [770,1209,1690,619,782,798,616,765,730,787,1008,1776,1445,1370,1234,790,852,1077,912,881,795,822,1098,277,1072,939,1248,1671,1405,1593][i],
    gemiddeld:     [220.0,241.8,338.0,154.8,230.0,295.6,246.4,263.8,317.4,342.2,438.3,740.0,555.8,685.0,587.6,395.0,426.0,538.5,480.0,440.5,378.6,411.0,549.0,138.5,536.0,469.5,624.0,835.5,702.5,796.5][i],
    kartografen:   [35,50,50,40,34,27,25,29,23,23,23,24,26,20,21,20,20,20,19,20,21,20,20,20,20,20,20,20,20,20][i],
  })),
  "Nov": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1603,1119,1556,727,933,799,845,750,801,932,1095,2023,1838,1481,1426,803,1003,1202,877,841,763,776,1180,239,1117,1020,1311,1762,1419,1675][i],
    afgehandeld:   [905,1297,1781,727,884,798,672,833,837,873,1110,1931,1697,1540,1397,878,880,1206,974,958,879,822,1219,277,1292,1075,1386,1824,1508,1755][i],
    gemiddeld:     [226.3,235.8,323.8,165.2,238.9,257.4,258.5,268.7,334.8,349.2,444.0,715.2,606.1,700.0,607.4,399.1,400.0,548.2,463.8,435.5,382.2,373.6,554.1,125.9,587.3,488.6,630.0,829.1,685.5,797.7][i],
    kartografen:   [40,55,55,44,37,31,26,31,25,25,25,27,28,22,23,22,22,22,21,22,23,22,22,22,22,22,22,22,22,22][i],
  })),
  "Dec": JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1647,1170,1600,780,933,799,932,750,864,1020,1218,2098,1949,1580,1481,837,2090,1255,950,932,835,776,1296,239,1339,1133,1459,1847,1504,1831][i],
    afgehandeld:   [937,1416,1789,780,884,798,736,833,941,975,1245,2174,1949,1639,1537,924,1871,1313,1000,1030,945,822,1278,277,1406,1171,1601,1890,1647,1861][i],
    gemiddeld:     [208.2,236.0,298.2,162.5,215.6,228.0,262.9,245.0,348.5,187.5,461.1,724.7,649.7,682.9,614.8,385.0,779.6,547.1,454.5,429.2,378.0,342.5,532.5,115.4,585.8,487.9,667.1,787.5,686.3,775.4][i],
    kartografen:   [45,60,60,48,41,35,28,34,27,52,27,30,30,24,25,24,24,24,22,24,25,24,24,24,24,24,24,24,24,24][i],
  })),
};

const PERIODES: { label: string; range: [number, number] }[] = [
  { label: "Alle jaren (1996–2025)", range: [0, 30] },
  { label: "1996–2005", range: [0, 10] },
  { label: "2006–2015", range: [10, 20] },
  { label: "2016–2025", range: [20, 30] },
];

const LANDMETERS_DATA: Record<string, LandmetersRij[]> = {
  "Jan": LANDMETERS_JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [302,60,66,88,43,60,96,124,32,82,63,102,102,89,90,45,53,73,45,114,92,91,82,71,114,99,54,258,164,191,248][i],
    afgehandeld:   [102,102,48,150,64,88,52,102,72,53,54,35,101,98,73,118,57,82,74,82,71,60,56,86,79,89,79,127,88,94,129][i],
    uitbesteding:  [28,53,6,113,18,22,5,4,0,4,0,0,3,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i],
    gemiddeld:     [113.3,102.0,53.3,187.5,80.0,146.7,86.7,170.0,144.0,132.5,180.0,87.5,168.3,163.3,121.7,196.7,95.0,164.0,148.0,136.7,118.3,100.0,93.3,143.3,131.7,148.3,131.7,211.7,146.7,134.3,184.3][i],
    landmeters:    [9,10,9,8,8,6,6,6,5,4,3,4,6,6,6,6,6,5,5,6,6,6,6,6,6,6,6,6,6,7,7][i],
  })),
  "Feb": LANDMETERS_JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [388,233,151,391,83,117,168,193,84,195,127,181,289,291,194,182,131,149,146,239,162,167,181,218,192,241,142,366,501,281,326][i],
    afgehandeld:   [230,337,154,243,116,149,130,192,142,112,120,154,206,216,178,322,122,196,148,183,161,139,141,167,195,198,96,216,199,241,305][i],
    uitbesteding:  [79,179,46,168,19,23,12,9,0,7,1,3,5,7,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i],
    gemiddeld:     [127.8,168.5,96.3,151.9,72.5,124.2,108.3,160.0,142.0,160.0,200.0,171.1,171.7,180.0,148.3,268.3,110.9,196.0,148.0,152.5,134.2,115.8,117.5,139.2,162.5,165.0,80.0,180.0,165.8,172.1,217.9][i],
    landmeters:    [18,20,16,16,16,12,12,12,10,7,6,9,12,12,12,12,11,10,10,12,12,12,12,12,12,12,12,12,12,14,14][i],
  })),
  "Mrt": LANDMETERS_JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [706,370,210,543,132,128,285,347,153,311,268,393,554,398,276,285,221,233,218,300,245,274,310,395,290,334,225,462,607,491,485][i],
    afgehandeld:   [553,436,213,384,170,245,237,285,242,177,168,333,315,337,328,461,193,264,251,278,242,208,247,288,279,277,165,440,373,419,462][i],
    uitbesteding:  [326,203,61,236,25,58,47,20,0,13,1,5,5,7,2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i],
    gemiddeld:     [204.8,145.3,92.6,160.0,70.8,136.1,148.1,158.3,161.3,160.9,168.0,237.9,175.0,187.2,182.2,256.1,120.6,176.0,167.3,154.4,134.4,115.6,137.2,160.0,155.0,153.9,91.7,244.4,196.3,199.5,231.0][i],
    landmeters:    [27,30,23,24,24,18,16,18,15,11,10,14,18,18,18,18,16,15,15,18,18,18,18,18,18,18,18,18,19,21,20][i],
  })),
  "Apr": LANDMETERS_JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [796,512,258,685,367,176,334,408,219,416,394,460,812,581,422,422,279,321,299,356,347,356,397,557,392,334,302,563,686,664,651][i],
    afgehandeld:   [824,555,281,571,376,300,326,355,313,232,309,427,494,501,415,542,270,330,335,369,327,309,315,413,387,277,230,501,583,533,657][i],
    uitbesteding:  [520,261,77,296,181,61,72,38,0,14,4,5,5,8,3,1,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i],
    gemiddeld:     [228.9,135.4,93.7,178.4,117.5,125.0,163.0,154.3,156.5,145.0,220.7,224.7,205.8,208.8,172.9,225.8,128.6,165.0,167.5,153.8,136.3,128.8,131.3,172.1,161.3,115.4,95.8,208.8,224.2,190.4,252.7][i],
    landmeters:    [36,41,30,32,32,24,20,23,20,16,14,19,24,24,24,24,21,20,20,24,24,24,24,24,24,24,24,24,26,28,26][i],
  })),
  "Mei": LANDMETERS_JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1040,604,360,893,439,247,401,466,271,488,484,558,987,666,591,542,372,541,421,410,397,404,539,669,475,466,452,722,748,795,796][i],
    afgehandeld:   [953,707,391,631,516,403,399,425,399,360,409,497,861,713,534,665,347,433,410,448,411,376,394,533,465,304,313,623,707,693,763][i],
    uitbesteding:  [585,358,103,312,270,105,76,51,1,15,8,5,6,10,3,1,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i],
    gemiddeld:     [211.8,136.0,100.3,157.8,129.0,134.3,166.3,146.6,159.6,171.4,227.2,207.1,287.0,237.7,178.0,221.7,133.5,173.2,164.0,149.3,137.0,125.3,131.3,177.7,155.0,101.3,104.3,207.7,214.2,198.0,238.4][i],
    landmeters:    [45,52,39,40,40,30,24,29,25,21,18,24,30,30,30,30,26,25,25,30,30,30,30,30,30,30,30,30,33,35,32][i],
  })),
  "Jun": LANDMETERS_JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1188,1010,450,951,522,304,493,568,373,568,546,654,1161,973,690,689,410,659,575,469,482,497,638,814,581,646,587,825,876,889,993][i],
    afgehandeld:   [1088,773,555,712,639,493,486,484,502,444,520,597,1124,860,729,758,423,568,501,522,485,447,508,647,563,546,455,736,828,840,950][i],
    uitbesteding:  [662,376,139,321,347,154,102,60,2,19,9,9,7,23,6,1,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i],
    gemiddeld:     [201.5,124.7,115.6,148.3,133.1,140.9,173.6,151.3,167.3,170.8,236.4,205.9,312.2,238.9,202.5,210.6,136.5,189.3,167.0,145.0,134.7,124.2,141.1,179.7,156.4,151.7,126.4,204.4,207.0,200.0,250.0][i],
    landmeters:    [54,62,48,48,48,35,28,32,30,26,22,29,36,36,36,36,31,30,30,36,36,36,36,36,36,36,36,36,40,42,38][i],
  })),
  "Jul": LANDMETERS_JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1272,1106,515,1035,567,424,589,620,422,590,646,790,1294,1137,775,798,476,722,652,573,565,568,765,887,683,774,765,923,1054,1062,1088][i],
    afgehandeld:   [1242,856,655,831,718,563,598,540,572,504,576,714,1343,968,825,913,483,685,652,579,563,506,625,752,695,671,571,867,900,949,1089][i],
    uitbesteding:  [717,389,158,390,387,166,131,82,2,22,10,10,7,23,6,1,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i],
    gemiddeld:     [197.1,118.9,114.9,148.4,128.2,137.3,181.2,154.3,168.2,162.6,221.5,210.0,319.8,230.5,196.4,217.4,134.2,195.7,186.3,141.2,134.0,120.5,148.8,179.0,165.5,159.8,136.0,206.4,191.5,193.7,247.5][i],
    landmeters:    [63,72,57,56,56,41,33,35,34,31,26,34,42,42,42,42,36,35,35,41,42,42,42,42,42,42,42,42,47,49,44][i],
  })),
  "Aug": LANDMETERS_JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1326,1205,589,1236,627,510,652,679,479,692,706,1006,1492,1388,1012,980,731,809,755,667,630,654,856,1027,777,896,904,1080,1184,1165,1316][i],
    afgehandeld:   [1369,970,736,921,761,649,665,579,640,580,646,853,1550,1166,1052,1028,522,771,728,676,629,585,725,868,760,786,695,960,1093,1052,1234][i],
    uitbesteding:  [721,402,169,402,390,190,139,85,6,25,10,10,19,25,6,1,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i],
    gemiddeld:     [190.1,118.3,111.5,143.9,120.8,141.1,179.7,152.4,164.1,161.1,215.3,213.3,322.9,242.9,219.2,214.2,127.3,192.8,177.6,147.0,131.0,121.9,151.0,180.8,158.3,163.8,144.8,200.0,202.4,187.9,246.8][i],
    landmeters:    [72,82,66,64,63,46,37,38,39,36,30,40,48,48,48,48,41,40,41,46,48,48,48,48,48,48,48,48,54,56,50][i],
  })),
  "Sep": LANDMETERS_JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1477,1313,728,1345,809,585,719,809,543,802,789,1140,1727,1516,1132,1090,796,871,840,766,747,752,962,1149,883,1056,1030,1209,1650,1323,1524][i],
    afgehandeld:   [1445,1056,846,1252,852,729,726,634,697,656,752,944,1721,1418,1185,1098,637,882,823,776,709,663,827,974,847,900,840,1119,1480,1171,1359][i],
    uitbesteding:  [721,429,229,485,410,208,152,94,9,27,12,12,22,28,6,9,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i],
    gemiddeld:     [178.4,114.8,114.3,173.9,121.7,142.9,177.1,151.0,166.0,160.0,221.2,209.8,318.7,262.6,219.4,203.3,138.5,196.0,175.1,152.2,131.3,122.8,153.1,180.4,156.9,166.7,155.6,207.2,242.6,185.9,242.7][i],
    landmeters:    [81,92,74,72,70,51,41,42,42,41,34,45,54,54,54,54,46,45,47,51,54,54,54,54,54,54,54,54,61,63,56][i],
  })),
  "Okt": LANDMETERS_JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1652,1512,1022,1493,879,651,791,867,641,851,907,1226,1873,1754,1249,1146,888,931,930,823,796,807,962,1272,987,1180,1126,1332,1761,1526,1683][i],
    afgehandeld:   [1549,1250,981,1356,915,858,799,698,753,759,841,1059,1894,1666,1292,1222,703,975,920,837,816,733,827,1100,943,1052,946,1253,1633,1302,1517][i],
    uitbesteding:  [754,515,295,508,429,256,158,96,10,34,12,14,24,28,6,12,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i],
    gemiddeld:     [170.2,122.5,119.6,169.5,120.4,153.2,177.6,148.5,163.7,165.0,221.3,211.8,315.7,277.7,215.3,203.7,137.8,195.0,176.9,149.5,138.3,124.2,140.2,183.3,157.2,175.3,157.7,208.8,240.1,186.0,244.7][i],
    landmeters:    [91,102,82,80,76,56,45,47,46,46,38,50,60,60,60,60,51,50,52,56,59,59,59,60,60,60,60,60,68,70,62][i],
  })),
  "Nov": LANDMETERS_JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1722,1603,1119,1556,960,723,791,951,724,969,1037,1377,2002,1841,1390,1252,988,1001,1076,882,872,895,962,1320,1074,1377,1267,1512,1866,1688,1810][i],
    afgehandeld:   [1615,1365,1168,1468,975,936,799,789,829,856,933,1188,2032,1765,1481,1426,784,1041,1078,910,907,805,827,1216,1020,1274,1059,1401,1718,1387,1673][i],
    uitbesteding:  [762,562,401,525,436,267,158,104,18,35,22,16,35,28,33,12,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i],
    gemiddeld:     [158.3,123.0,129.8,166.8,118.9,153.4,156.7,151.7,165.8,167.8,222.1,212.1,307.9,267.4,224.4,216.1,140.0,189.3,185.9,146.8,139.5,123.8,127.2,184.2,154.5,193.0,160.5,212.3,229.1,180.1,246.0][i],
    landmeters:    [102,111,90,88,82,61,51,52,50,51,42,56,66,66,66,66,56,55,58,62,65,65,65,66,66,66,66,66,75,77,68][i],
  })),
  "Dec": LANDMETERS_JAREN.map((jaar, i) => ({
    jaar,
    binnengekomen: [1772,1647,1170,1600,1054,723,791,1004,724,1050,1091,1434,2055,1883,1631,1300,1100,1046,1129,947,917,928,962,1350,1179,1437,1335,1603,1920,1788,1888][i],
    afgehandeld:   [1655,1734,1264,1494,1069,936,799,876,829,919,1021,1311,2107,1876,1587,1481,818,1070,1128,961,953,856,827,1260,1085,1348,1117,1530,1835,1545,1774][i],
    uitbesteding:  [762,598,461,533,488,267,158,104,18,36,23,23,38,30,34,17,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i],
    gemiddeld:     [147.8,144.5,129.0,155.6,121.5,139.7,140.2,153.7,150.7,167.1,222.0,211.5,292.6,260.6,220.4,205.7,136.3,178.3,176.3,141.3,134.2,120.6,116.5,175.0,150.7,187.2,155.1,212.5,223.8,183.9,239.7][i],
    landmeters:    [111,120,99,96,90,69,57,58,56,58,48,62,72,72,72,72,62,62,64,68,71,71,71,72,72,72,72,72,82,85,74][i],
  })),
};

const BALIE_MAANDEN = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

type BalieRij = { maand: string; kkp: number; db: number; sa: number; rm: number; re: number; km: number; ik: number };

const BALIE_DATA: Record<string, BalieRij[]> = {
  "2025": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[2,6,12,18,22,26,33,38,45,50,53,53][i], db:[2,4,4,5,5,7,9,11,2,13,13,13][i], sa:[420,831,1248,1711,2129,2580,3057,3459,3897,4348,4763,5103][i], rm:[176,324,496,671,873,1080,1277,1462,1708,1882,2027,2149][i], re:[69,185,235,281,333,388,444,492,552,608,649,690][i], km:[16,25,50,62,82,96,113,120,136,294,312,336][i], ik:[2,2,2,3,3,3,4,4,4,4,4,4][i] })),
  "2024": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[4,11,16,18,20,26,32,35,39,43,47,50][i], db:[0,4,7,11,12,14,15,15,0,19,20,21][i], sa:[323,667,1054,1441,1793,2190,2539,2957,3394,3759,4122,4397][i], rm:[120,204,375,525,697,822,963,1103,1298,1436,1616,1770][i], re:[33,114,183,237,308,361,421,476,522,576,623,652][i], km:[8,22,37,50,60,71,82,91,114,136,144,156][i], ik:[0,0,0,0,0,0,0,0,0,1,1,1][i] })),
  "2023": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[4,6,9,13,20,24,26,34,39,47,59,66][i], db:[1,2,3,5,11,15,17,18,1,23,24,24][i], sa:[292,551,908,1154,1493,1843,2134,2491,2833,3250,3612,3826][i], rm:[92,193,322,457,573,687,847,997,1118,1258,1384,1500][i], re:[47,125,173,214,254,318,363,443,488,545,586,613][i], km:[3,9,17,24,30,33,35,46,55,64,73,79][i], ik:[0,0,0,2,3,3,3,4,4,5,5,6][i] })),
  "2022": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[1,3,9,10,19,24,32,38,45,49,52,53][i], db:[6,7,11,13,15,17,19,20,6,24,24,25][i], sa:[246,551,936,1187,1481,1768,2089,2438,2756,3053,3298,3479][i], rm:[140,254,426,517,690,810,964,1094,1232,1355,1498,1595][i], re:[79,118,195,236,311,362,406,457,509,571,619,648][i], km:[2,6,20,22,33,39,48,53,56,57,64,67][i], ik:[0,0,0,0,1,3,3,3,3,3,3,3][i] })),
  "2021": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[3,3,6,7,9,17,21,22,29,35,43,45][i], db:[1,2,2,2,3,5,5,5,1,10,12,17][i], sa:[223,461,657,739,893,1172,1512,1808,2110,2425,2680,2923][i], rm:[73,154,254,304,398,513,623,727,832,948,1069,1169][i], re:[46,104,124,150,185,211,266,305,351,394,445,475][i], km:[0,4,4,5,6,6,9,15,17,61,83,96][i], ik:[1,64,118,118,118,118,118,118,118,118,119,120][i] })),
  "2020": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[5,8,11,11,12,14,21,34,37,43,45,47][i], db:[1,1,1,1,2,6,8,9,1,15,19,19][i], sa:[243,499,675,678,753,901,1051,1279,1466,1668,1855,1997][i], rm:[98,169,272,273,317,372,423,493,554,626,700,766][i], re:[40,194,225,225,235,258,291,331,366,402,433,460][i], km:[2,15,18,18,23,32,59,61,62,63,65,67][i], ik:[24,54,71,71,71,196,196,230,232,235,235,235][i] })),
  "2019": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[3,8,13,19,27,32,36,36,39,47,49,49][i], db:[0,1,4,6,8,9,9,14,0,16,17,18][i], sa:[307,571,864,1175,1453,1686,1956,2221,2455,2708,2953,3210][i], rm:[94,168,271,356,438,545,630,706,792,908,1005,1074][i], re:[42,79,131,166,223,289,330,377,422,462,490,510][i], km:[5,6,12,12,13,13,19,21,23,27,30,32][i], ik:[35,67,98,142,181,209,224,282,321,359,386,421][i] })),
  "2018": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[7,7,11,13,13,13,17,21,25,32,35,35][i], db:[1,1,5,6,6,6,8,9,1,11,13,16][i], sa:[257,503,843,1066,1366,1677,1916,2213,2435,2687,2917,3089][i], rm:[86,168,275,351,449,541,617,715,803,906,997,1053][i], re:[34,76,101,131,189,220,261,308,344,383,406,429][i], km:[4,5,7,11,17,18,21,27,28,29,30,32][i], ik:[44,73,95,122,156,185,210,243,261,296,330,358][i] })),
  "2017": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[3,11,19,21,22,22,27,31,40,45,53,60][i], db:[2,5,7,7,8,8,9,10,2,13,15,16][i], sa:[202,385,599,728,933,1204,1459,1718,1981,2230,2511,2702][i], rm:[59,115,189,224,322,418,490,563,639,698,769,817][i], re:[45,80,140,166,217,257,288,320,355,392,426,454][i], km:[8,8,10,10,13,14,17,29,30,34,36,38][i], ik:[23,42,86,114,164,203,240,268,308,347,376,406][i] })),
  "2016": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[1,2,9,11,15,17,23,23,35,38,39,39][i], db:[4,6,9,9,9,11,12,13,4,19,20,20][i], sa:[161,327,530,722,913,1121,1331,1587,1804,2008,2204,2204][i], rm:[60,150,232,312,379,462,525,597,668,717,777,777][i], re:[16,52,102,148,183,235,280,326,372,395,416,416][i], km:[5,8,14,20,20,21,26,33,33,35,40,40][i], ik:[26,78,107,215,245,301,349,397,425,458,484,484][i] })),
  "2015": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[4,13,18,25,29,37,39,52,56,64,68,68][i], db:[0,0,3,4,4,4,5,6,0,8,9,9][i], sa:[166,292,485,621,752,963,1159,1362,1501,1630,1788,1788][i], rm:[60,130,198,255,288,347,404,477,555,622,718,718][i], re:[23,41,67,110,134,169,193,216,245,281,307,307][i], km:[3,8,13,13,13,15,23,23,26,26,26,26][i], ik:[73,135,160,198,248,290,302,331,390,430,495,495][i] })),
  "2014": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[8,12,17,20,23,27,32,35,40,40,42,43][i], db:[4,4,4,4,7,13,15,16,4,20,21,21][i], sa:[175,351,497,651,824,984,1144,1302,1450,1611,1790,1890][i], rm:[58,129,180,223,269,321,396,434,491,555,632,688][i], re:[27,46,81,100,131,159,196,213,264,287,307,328][i], km:[5,10,11,19,23,23,24,29,32,33,43,45][i], ik:[6,13,24,34,44,57,94,123,157,185,213,230][i] })),
  "2013": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[2,6,6,6,9,9,9,13,15,23,26,26][i], db:[0,0,0,0,0,0,0,5,7,10,26,26][i], sa:[168,290,457,622,786,937,1095,1266,1412,1594,1746,1746][i], rm:[52,96,176,268,355,414,463,519,585,636,689,689][i], re:[28,61,95,120,154,182,206,242,285,324,349,349][i], km:[4,6,13,14,18,20,22,23,27,28,31,31][i], ik:[24,40,57,74,79,95,115,122,135,149,157,157][i] })),
  "2012": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[3,5,7,7,8,8,8,11,14,15,15,15][i], db:[3,12,15,16,16,16,18,20,22,22,22,22][i], sa:[182,333,524,664,852,1007,1144,1310,1454,1586,1711,1802][i], rm:[56,120,199,243,316,387,445,516,567,606,656,679][i], re:[22,51,81,103,127,146,166,195,221,241,265,289][i], km:[3,5,8,8,9,12,12,13,15,17,20,22][i], ik:[19,40,63,76,101,121,141,154,172,184,201,223][i] })),
  "2011": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[5,10,12,14,17,18,18,18,21,22,22,24][i], db:[2,5,5,11,12,14,15,15,18,20,29,30][i], sa:[223,438,645,831,1036,1270,1470,1674,1873,2063,2226,2347][i], rm:[59,113,179,236,294,363,417,464,532,588,640,682][i], re:[27,50,72,106,164,192,223,258,304,333,355,377][i], km:[1,3,5,6,7,13,15,16,18,20,22,26][i], ik:[39,61,100,127,160,178,205,236,268,287,304,317][i] })),
  "2010": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[3,7,12,13,17,19,20,22,24,27,29,31][i], db:[2,3,7,9,15,25,36,48,56,58,61,64][i], sa:[194,371,615,806,1019,1244,1443,2234,2529,2749,2930,3071][i], rm:[47,105,168,223,275,332,383,431,493,537,537,623][i], re:[19,61,116,133,193,237,266,293,315,361,390,411][i], km:[3,7,8,9,13,15,20,25,31,32,38,43][i], ik:[36,85,118,157,195,238,257,268,294,317,343,85][i] })),
  "2009": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[3,5,6,10,10,10,10,10,10,10,10,10][i], db:[4,6,8,10,11,11,11,11,11,11,11,11][i], sa:[204,391,995,1176,1357,1357,1357,1357,1357,1357,1357,1357][i], rm:[66,114,278,339,400,400,400,400,400,400,400,400][i], re:[45,80,190,220,250,250,250,250,250,250,250,250][i], km:[2,5,9,12,12,12,12,12,12,12,12,12][i], ik:[33,61,153,185,217,217,217,217,217,217,217,217][i] })),
  "2008": BALIE_MAANDEN.map((maand, i) => ({ maand, kkp:[3,4,10,16,19,19,19,19,19,19,19,19][i], db:[0,0,3,6,8,8,8,8,8,8,8,8][i], sa:[205,403,600,825,1035,1035,1035,1035,1035,1035,1035,1035][i], rm:[61,106,162,238,295,295,295,295,295,295,295,295][i], re:[40,63,100,139,178,178,178,178,178,178,178,178][i], km:[4,8,9,14,17,17,17,17,17,17,17,17][i], ik:[38,90,149,192,236,236,236,236,236,236,236,236][i] })),
};

const BALIE_PRODUCTEN: { key: keyof Omit<BalieRij,"maand">; label: string; kleur: string }[] = [
  { key: "sa",  label: "Situatieschets A4/A3",     kleur: "#6366f1" },
  { key: "rm",  label: "Regulier Meetbrief",        kleur: "#22c55e" },
  { key: "re",  label: "Regulier Extractplan",      kleur: "#f97316" },
  { key: "km",  label: "Kadastrale Meetgegevens",   kleur: "#f59e0b" },
  { key: "kkp", label: "Kadastrale Kaart Producten",kleur: "#8b5cf6" },
  { key: "db",  label: "Digitale bestanden",        kleur: "#06b6d4" },
  { key: "ik",  label: "Inzage KAD",               kleur: "#ec4899" },
];

function maandelijkseGroei(data: BalieRij[]): BalieRij[] {
  return data.map((rij, i) => {
    if (i === 0) return { ...rij };
    const prev = data[i - 1];
    return {
      maand: rij.maand,
      kkp: rij.kkp - prev.kkp,
      db:  Math.max(0, rij.db  - prev.db),
      sa:  rij.sa  - prev.sa,
      rm:  rij.rm  - prev.rm,
      re:  rij.re  - prev.re,
      km:  rij.km  - prev.km,
      ik:  rij.ik  - prev.ik,
    };
  });
}

const BALIE_JAREN_ASC = Object.keys(BALIE_DATA).sort((a, b) => Number(a) - Number(b));

function BalieMedewerkerTab() {
  const [maandIdx, setMaandIdx] = useState(11);
  const [periodeIdx, setPeriodeIdx] = useState(0);

  const allePeriodes: { label: string; range: [number, number] }[] = [
    { label: "Alle jaren (2008–2025)", range: [0, 18] },
    { label: "2008–2015",             range: [0, 8]  },
    { label: "2016–2025",             range: [8, 18] },
  ];

  const periode  = allePeriodes[periodeIdx];
  const jaren    = BALIE_JAREN_ASC.slice(periode.range[0], periode.range[1]);
  const maandLabel = BALIE_MAANDEN[maandIdx];

  const data = jaren.map(jaar => {
    const rij = BALIE_DATA[jaar]?.[maandIdx];
    return {
      jaar,
      kkp: rij?.kkp ?? 0,
      db:  rij?.db  ?? 0,
      sa:  rij?.sa  ?? 0,
      rm:  rij?.rm  ?? 0,
      re:  rij?.re  ?? 0,
      km:  rij?.km  ?? 0,
      ik:  rij?.ik  ?? 0,
    };
  });

  const maxSA  = data.length ? Math.max(...data.map(d => d.sa))  : 0;
  const maxRM  = data.length ? Math.max(...data.map(d => d.rm))  : 0;
  const maxRE  = data.length ? Math.max(...data.map(d => d.re))  : 0;
  const maxKM  = data.length ? Math.max(...data.map(d => d.km))  : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Periode t/m:</span>
          <Select value={String(maandIdx)} onValueChange={v => setMaandIdx(Number(v))}>
            <SelectTrigger className="w-28" data-testid="select-balie-maand">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BALIE_MAANDEN.map((m, idx) => (
                <SelectItem key={m} value={String(idx)} data-testid={`option-balie-maand-${m}`}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Jaarbereik:</span>
          <Select value={String(periodeIdx)} onValueChange={v => setPeriodeIdx(Number(v))}>
            <SelectTrigger className="w-52" data-testid="select-balie-periode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allePeriodes.map((p, i) => (
                <SelectItem key={i} value={String(i)} data-testid={`option-balie-periode-${i}`}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Situatieschets A4/A3",    value: maxSA, sub: "hoogste t/m "+maandLabel, kleur: "#6366f1" },
          { label: "Regulier Meetbrief",       value: maxRM, sub: "hoogste t/m "+maandLabel, kleur: "#22c55e" },
          { label: "Regulier Extractplan",     value: maxRE, sub: "hoogste t/m "+maandLabel, kleur: "#f97316" },
          { label: "Kadastrale Meetgegevens",  value: maxKM, sub: "hoogste t/m "+maandLabel, kleur: "#f59e0b" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1 leading-tight">{k.label}</p>
              <p className="text-2xl font-bold" style={{ color: k.kleur }}>{k.value.toLocaleString("nl")}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Situatieschets — aparte grafiek ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Situatieschets A4/A3 per jaar — cumulatief t/m {maandLabel}</CardTitle>
          <CardDescription className="text-xs">Lijndiagram — Situatieschets afzonderlijk weergegeven</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: jaren.length * 48 + 80 }}>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data} margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number, name: string) => [v.toLocaleString("nl"), name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="sa" name="Situatieschets A4/A3" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Situatieschets A4/A3 — staafdiagram per jaar (t/m {maandLabel})</CardTitle>
          <CardDescription className="text-xs">Gecumuleerde waarde per jaar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: jaren.length * 48 + 80 }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [v.toLocaleString("nl"), "Situatieschets A4/A3"]} />
                  <Bar dataKey="sa" name="Situatieschets A4/A3" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Overige producttypen ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Overige producttypen per jaar — cumulatief t/m {maandLabel}</CardTitle>
          <CardDescription className="text-xs">Lijndiagram — Regulier Meetbrief, Regulier Extractplan, Kadastrale Meetgegevens, Kadastrale Kaart Producten, Digitale bestanden, Inzage KAD</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: jaren.length * 48 + 80 }}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number, name: string) => [v.toLocaleString("nl"), name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {BALIE_PRODUCTEN.filter(p => p.key !== "sa").map(p => (
                    <Line key={p.key} type="monotone" dataKey={p.key} name={p.label} stroke={p.kleur} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Overige producttypen — gestapeld per jaar (t/m {maandLabel})</CardTitle>
          <CardDescription className="text-xs">Totaaloverzicht excl. Situatieschets — gecumuleerd voor het geselecteerde maandpunt</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: jaren.length * 48 + 80 }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number, name: string) => [v.toLocaleString("nl"), name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {BALIE_PRODUCTEN.filter(p => p.key !== "sa").map(p => (
                    <Bar key={p.key} dataKey={p.key} name={p.label} fill={p.kleur} stackId="a" />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Detailoverzicht t/m {maandLabel} — {periode.label}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jaar</TableHead>
                  {BALIE_PRODUCTEN.map(p => (
                    <TableHead key={p.key} className="text-right" style={{ color: p.kleur }}>{p.label}</TableHead>
                  ))}
                  <TableHead className="text-right font-semibold">Totaal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(rij => {
                  const totaal = BALIE_PRODUCTEN.reduce((s, p) => s + (rij[p.key as keyof typeof rij] as number), 0);
                  return (
                    <TableRow key={rij.jaar} data-testid={`row-balie-${rij.jaar}-${maandLabel}`}>
                      <TableCell className="font-semibold">{rij.jaar}</TableCell>
                      {BALIE_PRODUCTEN.map(p => (
                        <TableCell key={p.key} className="text-right">{(rij[p.key as keyof typeof rij] as number).toLocaleString("nl")}</TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">{totaal.toLocaleString("nl")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Balie Medewerker III ─────────────────────────────────────────────────────

const BALIE3_JAREN_ASC = ["2008","2009","2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024","2025"];

type Balie3Rij = { inzagen: number; herInzage: number; naInzage: number; kadastraalLegger: number; verklaring: number; getuigschrift: number };

// Arrays indexed [maandIdx 0-11][jaarIdx 0-17]
const B3_IZ = [[602,460,502,405,365,523,512,348,500,624,963,1006,1090,1282,1637,1177,1675,1798],[1060,914,982,899,715,982,947,969,1303,1426,2160,2023,2153,2315,3117,2326,3079,3445],[1449,1361,1681,1347,1138,1461,1436,1510,2026,2255,3193,3539,3064,3402,4996,3791,4757,4971],[1779,1791,2210,1784,1513,1852,1877,2111,3205,2887,4068,4585,3123,4043,6252,4960,6403,6726],[2097,2149,2210,2199,1946,2277,2381,3371,3851,4010,5273,5646,3636,5057,7647,6365,7977,8473],[2097,2635,2210,2576,2491,2819,2792,3916,4935,5228,6479,6827,4246,7002,8989,7795,9783,10093],[2097,2985,2210,2962,3052,3300,3240,4480,5702,6300,7590,7818,5062,8381,10194,9057,11506,11916],[2097,3429,2210,3404,3627,3731,3755,4975,6414,7523,8721,8723,5963,9975,11589,10375,13086,13816],[2097,3956,2210,3796,4075,4227,4165,5848,7344,8467,9700,9746,6918,11719,12930,11613,14842,15631],[2097,4400,2210,4210,4629,4699,4586,6496,8024,9463,10659,10915,7870,13376,14112,12965,16536,17301],[2097,4925,2210,4656,5126,5162,5081,7304,8935,10468,11822,10915,8852,15335,15300,14484,18139,18960],[2097,5341,2210,4975,5482,5162,5761,7304,8935,11218,12835,10915,9879,17072,16249,15510,19573,20333]];
const B3_HI = [[55,35,48,33,27,54,51,79,31,57,60,64,70,89,134,130,124,176],[110,78,86,74,66,90,110,149,55,110,131,137,153,221,261,282,265,346],[166,148,157,147,108,141,167,221,106,168,199,204,215,299,406,461,432,496],[224,187,213,196,715,202,204,312,171,208,256,291,233,335,602,572,605,725],[268,242,213,257,192,263,268,397,207,288,335,368,293,426,846,761,789,867],[268,296,213,306,239,317,344,467,260,355,395,447,354,546,1032,976,986,1113],[268,373,213,343,288,356,405,537,305,411,452,511,399,710,1217,1148,1291,1268],[268,417,213,389,339,392,474,622,388,463,547,579,460,870,1467,1336,1471,1410],[268,480,213,437,393,433,526,647,438,528,623,660,515,1020,1609,1522,1676,1759],[268,536,213,477,442,491,596,712,512,606,695,734,587,1200,1769,1699,1906,2024],[268,589,213,524,488,558,686,748,575,666,782,734,656,1506,2018,1898,2143,2259],[268,653,213,574,523,558,751,748,575,729,836,734,754,1713,2199,2147,2384,2512]];
const B3_NI = [[288,233,121,97,102,157,149,191,136,125,159,146,168,211,174,209,225,232],[535,487,269,175,215,275,304,342,279,257,331,352,365,445,377,408,396,481],[763,663,445,318,342,461,478,591,441,458,510,517,511,634,653,653,605,712],[1053,932,639,461,451,672,622,847,594,617,680,742,524,712,897,831,812,1007],[1329,1080,639,630,561,854,899,1067,763,834,896,926,651,893,1211,1086,1036,1230],[1329,1245,639,770,700,1049,1169,1343,910,1028,1100,1132,813,1136,1498,1361,1277,1509],[1329,1416,639,907,848,1240,1366,1550,1085,1225,1280,1330,939,1397,1761,1597,1589,1782],[1329,1585,639,1032,1046,1429,1585,1779,1306,1412,1506,1491,1080,1636,2085,1822,1893,1982],[1329,1750,639,1145,1220,1595,1790,1892,1485,1586,1692,1671,1220,1875,2335,2036,2160,2357],[1329,1872,639,1286,1376,1772,2041,2023,1665,1802,1899,1877,1388,2110,2574,2309,2465,2699],[1329,1975,639,1421,1528,1950,2211,2181,1859,2008,2129,1877,1559,2503,2934,2551,2767,3024],[1329,2165,639,1587,1678,1950,2461,2181,1859,2185,2329,1877,1763,2796,3227,2876,3087,3409]];
const B3_KL = [[40,47,19,29,18,27,31,24,18,44,34,40,45,47,83,58,39,82],[64,82,61,53,48,60,48,42,51,84,104,77,196,120,135,139,138,206],[101,134,112,76,77,91,84,71,100,146,132,139,234,155,226,198,224,278],[142,167,129,108,99,111,101,112,137,172,165,174,234,189,270,251,283,359],[174,225,129,137,126,145,130,136,169,225,228,236,249,232,347,313,380,434],[174,266,129,166,146,179,158,177,222,265,264,306,277,259,406,396,465,510],[174,294,129,191,173,206,192,204,267,296,316,358,312,319,466,450,542,591],[174,324,129,228,206,244,209,225,319,330,363,410,353,369,532,548,616,670],[174,349,129,271,232,283,244,255,378,365,402,462,392,423,590,615,681,763],[174,394,129,296,256,309,260,287,401,402,441,504,439,491,675,673,759,852],[174,423,129,319,279,334,277,301,423,438,465,504,479,541,741,732,817,900],[174,447,129,337,306,334,298,301,423,471,488,504,506,577,778,772,866,953]];
const B3_VK = [[45,145,75,46,31,34,43,35,48,61,86,59,58,72,37,32,39,35],[138,248,125,99,58,71,95,67,98,106,145,96,100,135,74,69,66,84],[138,310,187,150,86,120,142,114,155,183,284,185,143,196,141,109,109,150],[192,381,260,179,111,171,182,186,194,237,372,246,143,212,208,146,151,202],[237,456,260,211,141,206,251,217,238,316,449,305,158,229,270,210,200,248],[237,529,260,237,178,278,343,270,300,426,544,370,197,294,320,257,254,329],[237,584,260,287,209,315,399,324,350,525,643,415,253,372,359,296,291,403],[237,633,260,322,243,358,436,374,412,622,746,480,331,440,416,342,327,446],[237,680,260,368,277,413,473,427,471,704,804,549,404,509,453,385,377,483],[237,724,260,390,313,482,526,471,554,755,885,633,460,584,507,428,414,512],[237,760,260,419,333,520,554,505,637,837,957,633,506,637,557,468,449,548],[237,781,260,437,344,520,585,505,637,892,1005,633,548,681,586,487,478,588]];
const B3_GT = [[0,5,2,0,0,2,3,4,3,3,1,3,9,2,1,8,5,2],[2,7,2,0,1,7,10,13,3,5,5,10,14,7,1,9,6,2],[5,7,2,5,2,10,12,15,7,22,7,15,22,10,7,11,7,2],[5,13,2,5,2,11,14,19,8,30,7,19,22,11,8,15,9,2],[8,15,2,7,4,13,21,21,10,31,16,28,22,15,16,16,10,6],[8,19,2,12,5,14,21,26,10,38,18,34,22,16,18,16,10,7],[8,21,2,12,6,18,31,27,22,44,26,43,28,17,21,21,10,8],[8,25,2,14,6,23,38,37,22,46,27,46,39,20,21,23,11,10],[8,26,2,18,8,31,47,44,26,52,30,100,48,28,21,27,18,10],[8,26,2,29,8,31,47,44,29,63,56,104,49,32,21,30,23,12],[8,26,2,29,14,32,50,50,34,64,63,104,57,52,21,30,25,13],[8,32,2,29,16,32,53,50,34,66,63,104,63,53,22,31,29,13]];

const BALIE3_DATA: Record<string, Balie3Rij[]> = (() => {
  const out: Record<string, Balie3Rij[]> = {};
  BALIE3_JAREN_ASC.forEach((jaar, j) => {
    out[jaar] = BALIE_MAANDEN.map((_, i) => ({
      inzagen:          B3_IZ[i][j],
      herInzage:        B3_HI[i][j],
      naInzage:         B3_NI[i][j],
      kadastraalLegger: B3_KL[i][j],
      verklaring:       B3_VK[i][j],
      getuigschrift:    B3_GT[i][j],
    }));
  });
  return out;
})();

const BALIE3_PRODUCTEN: { key: keyof Balie3Rij; label: string; kleur: string }[] = [
  { key: "inzagen",          label: "Inzagen",           kleur: "#6366f1" },
  { key: "herInzage",        label: "Her inzage",        kleur: "#22c55e" },
  { key: "naInzage",         label: "Na inzage",         kleur: "#f97316" },
  { key: "kadastraalLegger", label: "Kadastrale legger", kleur: "#f59e0b" },
  { key: "verklaring",       label: "Verklaring",        kleur: "#ec4899" },
  { key: "getuigschrift",    label: "Getuigschrift",     kleur: "#14b8a6" },
];

function BalieM3Tab() {
  const [maandIdx, setMaandIdx]   = useState(11);
  const [periodeIdx, setPeriodeIdx] = useState(0);

  const allePeriodes: { label: string; range: [number, number] }[] = [
    { label: "Alle jaren (2008–2025)", range: [0, 18] },
    { label: "2008–2015",             range: [0, 8]  },
    { label: "2016–2025",             range: [8, 18] },
  ];

  const periode    = allePeriodes[periodeIdx];
  const jaren      = BALIE3_JAREN_ASC.slice(periode.range[0], periode.range[1]);
  const maandLabel = BALIE_MAANDEN[maandIdx];

  const data = jaren.map(jaar => {
    const rij = BALIE3_DATA[jaar]?.[maandIdx];
    return { jaar, ...(rij ?? { inzagen:0, herInzage:0, naInzage:0, kadastraalLegger:0, verklaring:0, getuigschrift:0 }) };
  });

  const maxIZ = data.length ? Math.max(...data.map(d => d.inzagen))          : 0;
  const maxHI = data.length ? Math.max(...data.map(d => d.herInzage))        : 0;
  const maxNI = data.length ? Math.max(...data.map(d => d.naInzage))         : 0;
  const maxKL = data.length ? Math.max(...data.map(d => d.kadastraalLegger)) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Periode t/m:</span>
          <Select value={String(maandIdx)} onValueChange={v => setMaandIdx(Number(v))}>
            <SelectTrigger className="w-28" data-testid="select-balie3-maand">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BALIE_MAANDEN.map((m, idx) => (
                <SelectItem key={m} value={String(idx)} data-testid={`option-balie3-maand-${m}`}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Jaarbereik:</span>
          <Select value={String(periodeIdx)} onValueChange={v => setPeriodeIdx(Number(v))}>
            <SelectTrigger className="w-52" data-testid="select-balie3-periode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allePeriodes.map((p, i) => (
                <SelectItem key={i} value={String(i)} data-testid={`option-balie3-periode-${i}`}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Inzagen",           value: maxIZ, kleur: "#6366f1" },
          { label: "Her inzage",        value: maxHI, kleur: "#22c55e" },
          { label: "Na inzage",         value: maxNI, kleur: "#f97316" },
          { label: "Kadastrale legger", value: maxKL, kleur: "#f59e0b" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1 leading-tight">{k.label}</p>
              <p className="text-2xl font-bold" style={{ color: k.kleur }}>{k.value.toLocaleString("nl")}</p>
              <p className="text-xs text-muted-foreground mt-1">hoogste t/m {maandLabel}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Inzagen — aparte grafiek ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Inzagen per jaar — cumulatief t/m {maandLabel}</CardTitle>
          <CardDescription className="text-xs">Lijndiagram — Inzagen afzonderlijk weergegeven</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: jaren.length * 48 + 80 }}>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data} margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number, name: string) => [v.toLocaleString("nl"), name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="inzagen" name="Inzagen" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Inzagen — staafdiagram per jaar (t/m {maandLabel})</CardTitle>
          <CardDescription className="text-xs">Gecumuleerde waarde per jaar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: jaren.length * 48 + 80 }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [v.toLocaleString("nl"), "Inzagen"]} />
                  <Bar dataKey="inzagen" name="Inzagen" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Overige producttypen ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Overige producttypen per jaar — cumulatief t/m {maandLabel}</CardTitle>
          <CardDescription className="text-xs">Lijndiagram — Her inzage, Na inzage, Kadastrale legger, Verklaring, Getuigschrift</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: jaren.length * 48 + 80 }}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number, name: string) => [v.toLocaleString("nl"), name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {BALIE3_PRODUCTEN.filter(p => p.key !== "inzagen").map(p => (
                    <Line key={p.key} type="monotone" dataKey={p.key} name={p.label} stroke={p.kleur} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Overige producttypen — gestapeld per jaar (t/m {maandLabel})</CardTitle>
          <CardDescription className="text-xs">Totaaloverzicht excl. Inzagen — gecumuleerd voor het geselecteerde maandpunt</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: jaren.length * 48 + 80 }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number, name: string) => [v.toLocaleString("nl"), name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {BALIE3_PRODUCTEN.filter(p => p.key !== "inzagen").map(p => (
                    <Bar key={p.key} dataKey={p.key} name={p.label} fill={p.kleur} stackId="a" />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Detailoverzicht t/m {maandLabel} — {periode.label}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jaar</TableHead>
                  {BALIE3_PRODUCTEN.map(p => (
                    <TableHead key={p.key} className="text-right" style={{ color: p.kleur }}>{p.label}</TableHead>
                  ))}
                  <TableHead className="text-right font-semibold">Totaal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(rij => {
                  const totaal = BALIE3_PRODUCTEN.reduce((s, p) => s + rij[p.key], 0);
                  return (
                    <TableRow key={rij.jaar} data-testid={`row-balie3-${rij.jaar}-${maandLabel}`}>
                      <TableCell className="font-semibold">{rij.jaar}</TableCell>
                      {BALIE3_PRODUCTEN.map(p => (
                        <TableCell key={p.key} className="text-right">{rij[p.key].toLocaleString("nl")}</TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">{totaal.toLocaleString("nl")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Trend OR Algemeen ─────────────────────────────────────────────────────────

const ORA_JAREN_ASC = ["2001","2002","2003","2004","2005","2006","2007","2008","2009","2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024","2025"];
const ORA_MAANDEN   = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

type OrAlgemRij = { aktes: number; inschrijvingen: number; doorhalingen: number; opheffingen: number; beslagen: number; cessies: number };

// Arrays indexed [maandIdx 0-11][jaarIdx 0-24]  (cumulative t/m maand, per jaar 2001-2025)
const ORA_AK = [[71,123,92,114,117,103,152,179,162,125,146,119,131,123,100,103,120,166,124,158,142,134,148,144,174],[198,243,226,242,248,252,317,372,330,285,280,233,253,237,211,231,238,304,301,329,292,304,293,314,381],[342,370,135,399,145,191,489,547,511,467,448,378,435,371,342,374,388,429,431,415,429,526,484,465,591],[482,492,284,523,300,359,679,835,686,663,599,505,593,494,472,499,503,583,613,438,489,712,634,675,812],[615,614,413,666,433,502,857,1083,845,850,762,634,724,646,574,637,672,769,752,555,649,933,860,857,1006],[767,735,560,829,591,693,1045,1338,1010,1018,897,799,873,790,740,776,817,921,917,716,870,1191,1076,1058,1248],[888,862,709,969,719,874,1205,1563,1163,1177,1041,948,991,919,867,906,1008,1079,1072,846,1064,1389,1276,1263,1464],[1015,1012,849,1105,873,1066,1365,1758,1285,1322,1160,1105,1117,1064,987,1066,1156,1253,1190,967,1273,1631,1473,1444,1615],[1120,1169,1001,1246,1019,1229,1566,1978,1431,1484,1274,1249,1263,1191,1125,1206,1300,1380,1355,1095,1472,1826,1663,1641,1856],[1256,1284,1143,1379,1149,1410,1777,2192,1614,1626,1405,1381,1391,1331,1250,1347,1479,1552,1523,1244,1656,2010,1861,1870,2081],[1390,1439,1242,1550,1284,1604,2002,2420,1797,1747,1543,1536,1533,1458,1371,1505,1644,1730,1675,1384,1866,2202,2068,2099,2325],[1517,1580,1384,1684,1458,1805,2227,2635,1993,1926,1705,1676,1704,1635,1557,1672,1786,1892,1844,1550,2116,2441,2295,2379,2684]];
const ORA_IS = [[45,96,114,122,129,125,138,171,171,119,141,148,131,119,91,89,90,119,89,128,107,72,88,85,86],[175,195,266,252,252,244,303,306,328,256,283,290,253,232,180,190,184,238,228,260,205,149,161,159,189],[306,310,404,389,410,438,471,463,509,438,468,444,394,355,315,327,316,367,318,304,309,266,269,245,294],[432,417,534,522,580,584,633,675,680,600,634,583,514,457,438,433,420,483,466,316,342,360,354,343,402],[532,552,663,677,724,750,793,855,842,782,812,732,650,604,536,551,592,604,581,402,427,468,486,448,495],[669,676,832,842,884,964,983,1055,1029,953,998,908,791,730,696,649,724,742,700,527,543,586,601,564,627],[780,798,988,1028,1038,1127,1165,1267,1211,1126,1176,1102,947,875,815,767,886,883,847,599,645,685,721,664,742],[924,951,1138,1190,1213,1334,1346,1425,1359,1303,1360,1303,1086,994,936,923,1017,1033,953,688,741,814,850,757,838],[1040,1102,1329,1355,1366,1496,1549,1641,1543,1473,1526,1495,1255,1120,1052,1047,1145,1179,1069,775,841,922,960,863,952],[1171,1251,1501,1503,1508,1671,1752,1872,1744,1627,1669,1654,1384,1270,1162,1171,1314,1320,1208,864,965,1032,1087,987,1086],[1289,1441,1622,1704,1673,1861,1979,2073,1928,1762,1867,1826,1508,1405,1274,1310,1455,1470,1341,956,1089,1162,1186,1091,1219],[1382,1612,1779,1838,1865,2076,2172,2273,2112,1958,2102,1972,1670,1543,1417,1456,1579,1604,1473,1050,1217,1303,1306,1228,1382]];
const ORA_DH = [[102,51,89,90,210,125,100,25,73,52,115,77,77,105,77,75,104,79,130,119,56,72,183,119,135],[125,87,174,178,317,176,164,71,129,93,185,172,158,199,135,135,173,150,193,188,159,119,276,211,233],[144,147,287,322,343,224,292,120,237,127,209,287,200,289,213,187,280,210,241,231,227,236,384,313,303],[189,187,356,400,455,273,342,145,323,169,236,362,231,321,282,282,347,331,298,242,265,303,456,395,396],[211,269,447,450,496,358,415,191,384,206,330,398,277,371,355,359,439,441,359,343,335,383,584,497,450],[292,315,536,516,573,481,499,223,449,258,419,458,333,454,400,417,524,526,432,455,415,439,741,612,544],[342,349,613,552,641,606,577,303,508,301,479,522,421,516,526,465,603,617,470,576,496,523,819,732,645],[454,448,668,673,714,733,655,443,571,343,533,598,474,590,611,532,670,701,589,638,546,702,941,816,731],[493,565,728,830,784,815,764,524,622,409,642,670,529,698,681,591,749,762,664,713,625,797,1043,878,824],[608,599,844,902,823,855,848,609,676,488,718,812,682,811,739,649,811,834,708,791,673,874,1170,932,934],[683,694,972,1008,872,965,978,719,725,551,792,884,740,909,824,769,921,886,811,883,774,1030,1255,1022,1033],[768,777,1055,1057,967,1115,1052,843,797,599,919,928,866,998,893,835,1071,939,900,927,867,1244,1364,1100,1128]];
const ORA_OP = [[7,3,10,7,5,8,5,8,11,12,12,9,9,8,4,0,7,1,16,10,9,8,6,23,3],[8,5,24,22,10,17,18,30,22,17,21,18,12,12,8,15,14,5,9,19,19,12,13,34,12],[12,14,34,28,14,27,28,39,38,25,30,34,18,15,24,25,24,13,16,23,25,26,33,52,22],[15,19,40,34,31,37,36,46,50,27,45,40,25,18,29,34,26,18,30,24,32,32,46,60,27],[19,26,47,41,38,42,47,52,62,36,50,51,36,23,32,39,33,25,39,30,43,39,66,71,37],[26,29,58,46,54,52,54,60,73,44,65,65,46,30,41,49,45,32,43,35,53,52,86,79,44],[38,33,68,56,63,58,64,70,84,56,80,73,52,43,43,56,48,43,47,39,62,65,97,89,54],[44,45,75,70,69,66,76,80,90,70,87,89,78,53,55,62,52,52,56,42,67,76,108,100,61],[56,58,83,87,79,75,79,94,103,83,103,99,64,55,58,76,60,56,67,46,76,84,119,114,106],[63,65,93,98,89,78,85,97,110,90,116,111,72,63,65,81,66,64,74,56,83,94,123,118,127],[68,75,96,108,93,88,94,102,119,93,126,114,80,74,70,90,75,71,76,61,92,101,128,128,138],[76,82,103,114,100,95,96,107,123,97,134,119,91,77,77,99,83,73,90,70,98,112,137,141,150]];
const ORA_BS = [[5,8,12,10,3,2,0,10,10,17,12,6,6,3,7,10,4,12,4,3,3,9,5,5,7],[12,18,23,21,12,5,2,24,19,26,22,13,21,8,9,15,11,28,23,5,9,14,11,11,14],[13,26,29,34,19,12,4,37,26,33,31,24,30,13,19,23,22,42,29,10,19,30,20,22,24],[33,36,45,59,32,15,6,53,36,42,42,34,37,19,24,31,30,54,38,13,19,39,34,28,33],[48,51,49,77,42,19,6,71,45,56,54,42,47,23,37,42,38,65,51,21,27,48,48,35,43],[55,56,61,93,53,21,6,75,45,65,61,56,61,28,44,51,45,82,62,31,35,62,51,46,52],[67,62,79,108,58,21,8,79,62,79,78,62,68,34,53,58,52,92,91,35,42,73,61,53,64],[76,74,91,125,63,21,14,85,75,91,89,71,76,39,59,65,72,106,101,42,50,87,69,62,79],[84,84,103,146,70,25,17,87,87,110,95,77,81,48,61,68,81,117,112,49,56,110,72,74,90],[94,90,111,153,70,33,26,88,100,121,109,83,87,53,70,73,82,130,123,59,63,129,82,81,100],[105,99,124,166,71,36,27,96,114,138,121,88,91,59,81,83,89,137,126,73,71,137,85,84,110],[112,99,129,167,76,37,32,98,130,143,135,93,101,68,90,91,93,149,129,77,89,141,92,86,117]];
const ORA_CS = [[2,0,1,4,3,2,0,2,2,0,2,0,0,0,0,0,1,0,0,0,0,1,0,0,0],[2,0,2,4,4,2,1,3,2,1,2,0,1,1,0,0,1,0,0,0,0,1,0,0,3],[2,0,3,4,6,2,2,3,3,3,4,2,1,1,0,0,1,0,0,0,0,1,1,3,4],[2,0,5,4,6,3,3,3,4,4,4,2,1,2,1,0,1,0,3,0,0,1,1,4,4],[2,0,5,5,10,3,3,4,7,5,5,2,2,2,1,0,1,0,3,0,1,1,1,4,5],[2,0,5,5,10,3,3,5,7,5,6,2,2,2,2,0,1,0,3,1,2,2,1,4,5],[5,1,5,6,10,3,4,5,7,6,6,2,2,3,2,0,2,1,3,1,2,2,2,5,6],[5,2,5,6,10,4,5,5,8,6,6,2,2,3,2,1,2,1,3,1,3,2,2,5,7],[5,2,5,7,14,4,5,6,8,6,6,4,2,3,3,1,2,1,3,1,4,3,2,7,7],[5,2,5,8,16,4,5,7,9,7,6,4,2,4,3,1,2,2,3,2,4,3,2,8,7],[5,2,5,9,19,4,5,8,10,7,6,4,2,5,3,1,5,2,3,2,7,3,2,10,8],[8,5,6,9,21,4,5,8,10,10,7,4,2,5,3,1,7,2,3,3,7,3,4,10,8]];

const ORA_COLORS: Record<string, string> = { aktes:"#3b82f6", inschrijvingen:"#10b981", doorhalingen:"#f59e0b", opheffingen:"#ef4444", beslagen:"#8b5cf6", cessies:"#ec4899" };
const ORA_LABELS: Record<string, string> = { aktes:"Aktes", inschrijvingen:"Inschrijvingen", doorhalingen:"Doorhalingen", opheffingen:"Opheffingen", beslagen:"Beslagen", cessies:"Cessies" };

function buildOraData(maandIdx: number, jarenFilter: string[]): OrAlgemRij[] {
  return jarenFilter.map((_j, i) => {
    const ji = ORA_JAREN_ASC.indexOf(jarenFilter[i]);
    return {
      aktes:          ORA_AK[maandIdx][ji],
      inschrijvingen: ORA_IS[maandIdx][ji],
      doorhalingen:   ORA_DH[maandIdx][ji],
      opheffingen:    ORA_OP[maandIdx][ji],
      beslagen:       ORA_BS[maandIdx][ji],
      cessies:        ORA_CS[maandIdx][ji],
    };
  });
}

const ORA_PERIODES = [
  { label: "Alle jaren (2001–2025)", jaren: ORA_JAREN_ASC },
  { label: "2001–2010", jaren: ORA_JAREN_ASC.slice(0, 10) },
  { label: "2011–2025", jaren: ORA_JAREN_ASC.slice(10) },
];

function TrendOrAlgemeenTab() {
  const [maand, setMaand]           = useState("Dec");
  const [periodeIdx, setPeriodeIdx] = useState(0);

  const maandIdx = ORA_MAANDEN.indexOf(maand);
  const { jaren } = ORA_PERIODES[periodeIdx];
  const data      = buildOraData(maandIdx, jaren);

  const chartData = jaren.map((j, i) => ({
    jaar: j,
    ...data[i],
  }));

  const maxAktes         = Math.max(...data.map(d => d.aktes));
  const maxInschrijvingen = Math.max(...data.map(d => d.inschrijvingen));
  const maxDoorhalingen  = Math.max(...data.map(d => d.doorhalingen));
  const maxOpheffingen   = Math.max(...data.map(d => d.opheffingen));

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Periode t/m maand</span>
          <Select value={maand} onValueChange={setMaand}>
            <SelectTrigger className="w-28 h-8 text-sm" data-testid="select-ora-maand">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORA_MAANDEN.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Jarenreeks</span>
          <Select value={String(periodeIdx)} onValueChange={v => setPeriodeIdx(Number(v))}>
            <SelectTrigger className="w-52 h-8 text-sm" data-testid="select-ora-periode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORA_PERIODES.map((p, i) => <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Max Aktes",          value: maxAktes,          color: ORA_COLORS.aktes },
          { label: "Max Inschrijvingen", value: maxInschrijvingen, color: ORA_COLORS.inschrijvingen },
          { label: "Max Doorhalingen",   value: maxDoorhalingen,   color: ORA_COLORS.doorhalingen },
          { label: "Max Opheffingen",    value: maxOpheffingen,    color: ORA_COLORS.opheffingen },
        ].map(k => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value.toLocaleString("nl-NL")}</p>
            <p className="text-xs text-muted-foreground">t/m {maand}</p>
          </Card>
        ))}
      </div>

      {/* Lijndiagram — alle producten */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Trend alle producten — cumulatief t/m {maand}</CardTitle>
          <CardDescription className="text-xs">Hoofdproducten (Aktes, Inschrijvingen, Doorhalingen) per jaar</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="jaar" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={55} tickFormatter={(v: number) => v.toLocaleString("nl-NL")} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(val: number, name: string) => [val.toLocaleString("nl-NL"), ORA_LABELS[name] ?? name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => ORA_LABELS[v] ?? v} />
              <Line type="monotone" dataKey="aktes"          stroke={ORA_COLORS.aktes}          strokeWidth={2} dot={false} name="aktes" />
              <Line type="monotone" dataKey="inschrijvingen" stroke={ORA_COLORS.inschrijvingen} strokeWidth={2} dot={false} name="inschrijvingen" />
              <Line type="monotone" dataKey="doorhalingen"   stroke={ORA_COLORS.doorhalingen}   strokeWidth={2} dot={false} name="doorhalingen" />
              <Line type="monotone" dataKey="opheffingen"    stroke={ORA_COLORS.opheffingen}    strokeWidth={1.5} dot={false} name="opheffingen" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="beslagen"       stroke={ORA_COLORS.beslagen}       strokeWidth={1.5} dot={false} name="beslagen" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="cessies"        stroke={ORA_COLORS.cessies}        strokeWidth={1}   dot={false} name="cessies" strokeDasharray="2 2" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Staafdiagram — gestapeld */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Gestapeld staafdiagram — cumulatief t/m {maand}</CardTitle>
          <CardDescription className="text-xs">Totaal volume per jaar opgedeeld per product</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="jaar" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={55} tickFormatter={(v: number) => v.toLocaleString("nl-NL")} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(val: number, name: string) => [val.toLocaleString("nl-NL"), ORA_LABELS[name] ?? name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => ORA_LABELS[v] ?? v} />
              <Bar dataKey="aktes"          stackId="a" fill={ORA_COLORS.aktes}          name="aktes"          radius={[0,0,0,0]} />
              <Bar dataKey="inschrijvingen" stackId="a" fill={ORA_COLORS.inschrijvingen} name="inschrijvingen" />
              <Bar dataKey="doorhalingen"   stackId="a" fill={ORA_COLORS.doorhalingen}   name="doorhalingen" />
              <Bar dataKey="opheffingen"    stackId="a" fill={ORA_COLORS.opheffingen}    name="opheffingen" />
              <Bar dataKey="beslagen"       stackId="a" fill={ORA_COLORS.beslagen}        name="beslagen" />
              <Bar dataKey="cessies"        stackId="a" fill={ORA_COLORS.cessies}         name="cessies"   radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailtabel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detailoverzicht — t/m {maand}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jaar</TableHead>
                  <TableHead className="text-right" style={{ color: ORA_COLORS.aktes }}>Aktes</TableHead>
                  <TableHead className="text-right" style={{ color: ORA_COLORS.inschrijvingen }}>Inschrijvingen</TableHead>
                  <TableHead className="text-right" style={{ color: ORA_COLORS.doorhalingen }}>Doorhalingen</TableHead>
                  <TableHead className="text-right" style={{ color: ORA_COLORS.opheffingen }}>Opheffingen</TableHead>
                  <TableHead className="text-right" style={{ color: ORA_COLORS.beslagen }}>Beslagen</TableHead>
                  <TableHead className="text-right" style={{ color: ORA_COLORS.cessies }}>Cessies</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map(r => (
                  <TableRow key={r.jaar} data-testid={`row-ora-${r.jaar}`}>
                    <TableCell className="font-medium">{r.jaar}</TableCell>
                    <TableCell className="text-right">{r.aktes.toLocaleString("nl-NL")}</TableCell>
                    <TableCell className="text-right">{r.inschrijvingen.toLocaleString("nl-NL")}</TableCell>
                    <TableCell className="text-right">{r.doorhalingen.toLocaleString("nl-NL")}</TableCell>
                    <TableCell className="text-right">{r.opheffingen.toLocaleString("nl-NL")}</TableCell>
                    <TableCell className="text-right">{r.beslagen.toLocaleString("nl-NL")}</TableCell>
                    <TableCell className="text-right">{r.cessies.toLocaleString("nl-NL")}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell>Gem.</TableCell>
                  <TableCell className="text-right">{(data.reduce((s,d)=>s+d.aktes,0)/data.length).toFixed(0)}</TableCell>
                  <TableCell className="text-right">{(data.reduce((s,d)=>s+d.inschrijvingen,0)/data.length).toFixed(0)}</TableCell>
                  <TableCell className="text-right">{(data.reduce((s,d)=>s+d.doorhalingen,0)/data.length).toFixed(0)}</TableCell>
                  <TableCell className="text-right">{(data.reduce((s,d)=>s+d.opheffingen,0)/data.length).toFixed(0)}</TableCell>
                  <TableCell className="text-right">{(data.reduce((s,d)=>s+d.beslagen,0)/data.length).toFixed(0)}</TableCell>
                  <TableCell className="text-right">{(data.reduce((s,d)=>s+d.cessies,0)/data.length).toFixed(0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function LandmetersTab() {
  const [maand, setMaand] = useState("Feb");
  const [periodeIdx, setPeriodeIdx] = useState(0);

  const allePeriodes: { label: string; range: [number, number] }[] = [
    { label: "Alle jaren (1995–2025)", range: [0, 31] },
    { label: "1995–2004", range: [0, 10] },
    { label: "2005–2014", range: [10, 20] },
    { label: "2015–2025", range: [20, 31] },
  ];

  const periode = allePeriodes[periodeIdx];
  const volledigeData = LANDMETERS_DATA[maand] || [];
  const data = volledigeData.slice(periode.range[0], periode.range[1]);

  const totBinnengekomen = data.reduce((s, d) => s + d.binnengekomen, 0);
  const totAfgehandeld   = data.reduce((s, d) => s + d.afgehandeld, 0);
  const totUitbesteding  = data.reduce((s, d) => s + d.uitbesteding, 0);
  const gemLandmeters    = data.length ? (data.reduce((s, d) => s + d.landmeters, 0) / data.length) : 0;
  const maxGemiddeld     = data.length ? Math.max(...data.map(d => d.gemiddeld)) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Periode t/m:</span>
          <Select value={maand} onValueChange={setMaand}>
            <SelectTrigger className="w-28" data-testid="select-maand-landmeters">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(LANDMETERS_DATA).map(m => (
                <SelectItem key={m} value={m} data-testid={`option-lm-maand-${m}`}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Jaarbereik:</span>
          <Select value={String(periodeIdx)} onValueChange={v => setPeriodeIdx(Number(v))}>
            <SelectTrigger className="w-52" data-testid="select-periode-landmeters">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allePeriodes.map((p, i) => (
                <SelectItem key={i} value={String(i)} data-testid={`option-lm-periode-${i}`}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Totaal binnengekomen</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totBinnengekomen.toLocaleString("nl")}</p>
            <p className="text-xs text-muted-foreground mt-1">t/m {maand} in geselecteerde periode</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Totaal afgehandeld</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totAfgehandeld.toLocaleString("nl")}</p>
            <p className="text-xs text-muted-foreground mt-1">t/m {maand} in geselecteerde periode</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Exercitie uitbesteding</p>
            <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">{totUitbesteding.toLocaleString("nl")}</p>
            <p className="text-xs text-muted-foreground mt-1">t/m {maand} in geselecteerde periode</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Hoogste gem./landmeter</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{maxGemiddeld > 0 ? maxGemiddeld.toFixed(1) : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">tienvoud, in periode</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Binnengekomen, Afgehandeld & Uitbesteding per jaar (t/m {maand})</CardTitle>
          <CardDescription className="text-xs">Staafdiagram — gecombineerd met gem. productie per landmeter (tienvoud, rechteras)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: data.length * 44 + 80 }}>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data} margin={{ top: 8, right: 60, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(0)} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(val: number, name: string) => [
                      name === "Gem./landmeter (×10)" ? val.toFixed(1) : val.toLocaleString("nl"),
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="binnengekomen" name="Binnengekomen"      fill="#6366f1" radius={[3,3,0,0]} />
                  <Bar yAxisId="left" dataKey="afgehandeld"   name="Afgehandeld"        fill="#22c55e" radius={[3,3,0,0]} />
                  <Bar yAxisId="left" dataKey="uitbesteding"  name="Exercitie uitbest." fill="#f97316" radius={[3,3,0,0]} />
                  <Line yAxisId="right" type="monotone" dataKey="gemiddeld" name="Gem./landmeter (×10)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Aantal landmeters per jaar</CardTitle>
          <CardDescription className="text-xs">Gem. over geselecteerde periode: {gemLandmeters.toFixed(1)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: data.length * 44 + 80 }}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, "auto"]} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(val: number) => [val, "Landmeters"]} />
                  <Bar dataKey="landmeters" name="Landmeters" fill="#8b5cf6" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Detailoverzicht t/m {maand} — {periode.label}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jaar</TableHead>
                <TableHead className="text-right">Binnengekomen</TableHead>
                <TableHead className="text-right">Afgehandeld</TableHead>
                <TableHead className="text-right">Uitbesteding</TableHead>
                <TableHead className="text-right">Verschil</TableHead>
                <TableHead className="text-right">Gem./landmeter (×10)</TableHead>
                <TableHead className="text-right">Landmeters</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const verschil = row.afgehandeld - row.binnengekomen;
                return (
                  <TableRow key={row.jaar} data-testid={`row-landmeters-${maand}-${row.jaar}`}>
                    <TableCell className="font-semibold">{row.jaar}</TableCell>
                    <TableCell className="text-right text-indigo-600 dark:text-indigo-400">{row.binnengekomen}</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">{row.afgehandeld}</TableCell>
                    <TableCell className="text-right text-orange-500 dark:text-orange-400">{row.uitbesteding}</TableCell>
                    <TableCell className="text-right">
                      <span className={verschil > 0 ? "text-green-600 dark:text-green-400" : verschil < 0 ? "text-red-500" : "text-muted-foreground"}>
                        {verschil > 0 ? "+" : ""}{verschil}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-amber-600 dark:text-amber-400">{row.gemiddeld.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{row.landmeters}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/40 font-semibold">
                <TableCell>Totaal/Gem.</TableCell>
                <TableCell className="text-right text-indigo-600 dark:text-indigo-400">{totBinnengekomen}</TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-400">{totAfgehandeld}</TableCell>
                <TableCell className="text-right text-orange-500 dark:text-orange-400">{totUitbesteding}</TableCell>
                <TableCell className="text-right">
                  <span className={totAfgehandeld - totBinnengekomen >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                    {totAfgehandeld - totBinnengekomen >= 0 ? "+" : ""}{totAfgehandeld - totBinnengekomen}
                  </span>
                </TableCell>
                <TableCell className="text-right text-amber-600 dark:text-amber-400">
                  {data.length ? (data.reduce((s, d) => s + d.gemiddeld, 0) / data.length).toFixed(1) : "—"}
                </TableCell>
                <TableCell className="text-right">{gemLandmeters.toFixed(1)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

const KARTOGRAFIE_MAANDEN = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

function parseKartografieCSV(csv: string): { rows: { jaar: number; maand: string; binnengekomen: number; afgehandeld: number; gemiddeld: number; kartografen: number }[]; errors: string[] } {
  const rows: { jaar: number; maand: string; binnengekomen: number; afgehandeld: number; gemiddeld: number; kartografen: number }[] = [];
  const errors: string[] = [];
  const lines = csv.trim().split("\n").map(l => l.trim()).filter(Boolean);
  const header = lines[0]?.toLowerCase().replace(/\s/g, "");
  if (!header?.includes("jaar") || !header?.includes("maand")) {
    errors.push("Eerste rij moet de koptekst bevatten: jaar,maand,binnengekomen,afgehandeld,gemiddeld,kartografen");
    return { rows, errors };
  }
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;]/).map(c => c.trim());
    if (cols.length < 6) { errors.push(`Rij ${i + 1}: te weinig kolommen (${cols.length})`); continue; }
    const jaar = parseInt(cols[0]);
    const maand = cols[1];
    const binnengekomen = parseInt(cols[2]);
    const afgehandeld = parseInt(cols[3]);
    const gemiddeld = parseFloat(cols[4].replace(",", "."));
    const kartografen = parseInt(cols[5]);
    if (isNaN(jaar) || jaar < 2020 || jaar > 2100) { errors.push(`Rij ${i + 1}: ongeldig jaar "${cols[0]}"`); continue; }
    if (!KARTOGRAFIE_MAANDEN.includes(maand)) { errors.push(`Rij ${i + 1}: ongeldige maand "${maand}" (gebruik Jan, Feb, Mrt, Apr, Mei, Jun, Jul, Aug, Sep, Okt, Nov, Dec)`); continue; }
    if (isNaN(binnengekomen) || isNaN(afgehandeld) || isNaN(gemiddeld) || isNaN(kartografen)) { errors.push(`Rij ${i + 1}: ongeldige getal waarden`); continue; }
    rows.push({ jaar, maand, binnengekomen, afgehandeld, gemiddeld, kartografen });
  }
  return { rows, errors };
}

const CSV_VOORBEELD = `jaar,maand,binnengekomen,afgehandeld,gemiddeld,kartografen
2026,Jan,162,158,810.0,2
2026,Feb,295,287,780.5,4
2026,Mrt,470,461,765.0,6`;

function KartografieTab() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [maand, setMaand] = useState("Feb");
  const [periodeIdx, setPeriodeIdx] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<{ rows: ReturnType<typeof parseKartografieCSV>["rows"]; errors: string[] } | null>(null);

  const { data: apiData = [] } = useQuery<KartografieProductie[]>({
    queryKey: ["/api/kartografie-productie"],
  });

  type ImportRij = { jaar: number; maand: string; binnengekomen: number; afgehandeld: number; gemiddeld: number; kartografen: number };
  const importMutatie = useMutation({
    mutationFn: (rows: ImportRij[]) =>
      apiRequest("POST", "/api/kartografie-productie/import", { rows }),
    onSuccess: (_, rows) => {
      queryClient.invalidateQueries({ queryKey: ["/api/kartografie-productie"] });
      toast({ title: "Import geslaagd", description: `${rows.length} rijen geïmporteerd.` });
      setImportOpen(false);
      setCsvText("");
      setPreview(null);
    },
    onError: (err: Error) => {
      toast({ title: "Import mislukt", description: err.message, variant: "destructive" });
    },
  });

  const verwijderJaarMutatie = useMutation({
    mutationFn: (jaar: number) => apiRequest("DELETE", `/api/kartografie-productie/${jaar}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kartografie-productie"] });
      toast({ title: "Jaar verwijderd" });
    },
  });

  const apiJaren = [...new Set(apiData.map(r => String(r.jaar)))].sort();
  const alleJaren = [...new Set([...JAREN, ...apiJaren])].sort((a, b) => Number(a) - Number(b));

  const volledigeDataBase = KARTOGRAFIE_DATA[maand] || [];
  const volledigeData: KartografieRij[] = alleJaren.map(jaar => {
    const apiRij = apiData.find(r => String(r.jaar) === jaar && r.maand === maand);
    if (apiRij) return { jaar, binnengekomen: apiRij.binnengekomen, afgehandeld: apiRij.afgehandeld, gemiddeld: apiRij.gemiddeld, kartografen: apiRij.kartografen };
    return volledigeDataBase.find(r => r.jaar === jaar) ?? { jaar, binnengekomen: 0, afgehandeld: 0, gemiddeld: 0, kartografen: 0 };
  });

  const extendedPeriodes = [
    { label: `Alle jaren (1996–${alleJaren[alleJaren.length - 1] ?? 2025})`, range: [0, alleJaren.length] as [number, number] },
    { label: "1996–2005", range: [0, 10] as [number, number] },
    { label: "2006–2015", range: [10, 20] as [number, number] },
    { label: "2016–2025", range: [20, 30] as [number, number] },
    ...apiJaren.length > 0 ? [{ label: `Nieuw (${apiJaren[0]}–${apiJaren[apiJaren.length - 1]})`, range: [30, alleJaren.length] as [number, number] }] : [],
  ];

  const periode = extendedPeriodes[Math.min(periodeIdx, extendedPeriodes.length - 1)];
  const data = volledigeData.slice(periode.range[0], periode.range[1]);

  const totBinnengekomen = data.reduce((s, d) => s + d.binnengekomen, 0);
  const totAfgehandeld   = data.reduce((s, d) => s + d.afgehandeld, 0);
  const gemKartografen   = data.length ? (data.reduce((s, d) => s + d.kartografen, 0) / data.length) : 0;
  const maxGemiddeld     = data.length ? Math.max(...data.map(d => d.gemiddeld)) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Periode t/m:</span>
          <Select value={maand} onValueChange={setMaand}>
            <SelectTrigger className="w-28" data-testid="select-maand-kartografie">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(KARTOGRAFIE_DATA).map(m => (
                <SelectItem key={m} value={m} data-testid={`option-maand-${m}`}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Jaarbereik:</span>
          <Select value={String(periodeIdx)} onValueChange={v => setPeriodeIdx(Number(v))}>
            <SelectTrigger className="w-56" data-testid="select-periode-kartografie">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {extendedPeriodes.map((p, i) => (
                <SelectItem key={i} value={String(i)} data-testid={`option-periode-${i}`}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isAdmin && (
          <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={() => setImportOpen(true)} data-testid="button-import-kartografie">
            <Upload className="h-3.5 w-3.5" />
            CSV importeren
          </Button>
        )}
      </div>

      {isAdmin && apiJaren.length > 0 && (
        <Card className="border-indigo-200 dark:border-indigo-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Geïmporteerde jaren</CardTitle>
            <CardDescription className="text-xs">Jaren toegevoegd via CSV-import. Klik op een jaar om het te verwijderen.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {apiJaren.map(jaar => (
                <div key={jaar} className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  {jaar}
                  <button
                    onClick={() => verwijderJaarMutatie.mutate(Number(jaar))}
                    className="ml-1 hover:text-red-500 transition-colors"
                    data-testid={`button-delete-kartografie-jaar-${jaar}`}
                    title={`Verwijder jaar ${jaar}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={importOpen} onOpenChange={open => { setImportOpen(open); if (!open) { setCsvText(""); setPreview(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CSV importeren — Kartografen</DialogTitle>
            <DialogDescription>
              Voeg maandelijkse productiedata toe voor nieuwe jaren. Bestaande rijen (zelfde jaar + maand) worden overschreven.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-xs font-mono whitespace-pre leading-relaxed border">
              <p className="text-muted-foreground font-sans font-medium mb-1 not-italic">Verwacht formaat (komma of puntkomma als scheidingsteken):</p>
              {CSV_VOORBEELD}
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => fileInputRef.current?.click()} data-testid="button-upload-csv-file">
                <Upload className="h-3.5 w-3.5" /> Bestand kiezen
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setCsvText(CSV_VOORBEELD); setPreview(null); }} data-testid="button-load-example">
                <Download className="h-3.5 w-3.5" /> Voorbeeld laden
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => { setCsvText(ev.target?.result as string ?? ""); setPreview(null); };
                reader.readAsText(file);
                e.target.value = "";
              }} />
            </div>

            <Textarea
              placeholder="Plak hier de CSV-inhoud of kies een bestand..."
              className="font-mono text-xs min-h-[180px]"
              value={csvText}
              onChange={e => { setCsvText(e.target.value); setPreview(null); }}
              data-testid="textarea-csv-kartografie"
            />

            {preview && (
              <div className="space-y-2">
                {preview.errors.length > 0 && (
                  <div className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-red-700 dark:text-red-300 text-xs font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {preview.errors.length} fout{preview.errors.length !== 1 ? "en" : ""} gevonden
                    </div>
                    {preview.errors.map((e, i) => <p key={i} className="text-xs text-red-600 dark:text-red-400 pl-5">{e}</p>)}
                  </div>
                )}
                {preview.rows.length > 0 && (
                  <div className="rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3">
                    <div className="flex items-center gap-1.5 text-green-700 dark:text-green-300 text-xs font-medium mb-2">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {preview.rows.length} geldige rijen ({[...new Set(preview.rows.map(r => r.jaar))].join(", ")})
                    </div>
                    <div className="overflow-x-auto max-h-40">
                      <table className="text-xs w-full">
                        <thead><tr className="text-muted-foreground">{["Jaar","Maand","Binnengekomen","Afgehandeld","Gemiddeld","Kartografen"].map(h => <th key={h} className="text-left pr-4 pb-1">{h}</th>)}</tr></thead>
                        <tbody>
                          {preview.rows.slice(0, 24).map((r, i) => (
                            <tr key={i} className="border-t border-green-200 dark:border-green-800">
                              <td className="pr-4 py-0.5">{r.jaar}</td>
                              <td className="pr-4 py-0.5">{r.maand}</td>
                              <td className="pr-4 py-0.5">{r.binnengekomen}</td>
                              <td className="pr-4 py-0.5">{r.afgehandeld}</td>
                              <td className="pr-4 py-0.5">{r.gemiddeld.toFixed(1)}</td>
                              <td className="py-0.5">{r.kartografen}</td>
                            </tr>
                          ))}
                          {preview.rows.length > 24 && <tr><td colSpan={6} className="text-muted-foreground pt-1">... en {preview.rows.length - 24} meer</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setImportOpen(false); setCsvText(""); setPreview(null); }}>Annuleren</Button>
            {!preview ? (
              <Button onClick={() => setPreview(parseKartografieCSV(csvText))} disabled={!csvText.trim()} data-testid="button-preview-csv">
                Controleren
              </Button>
            ) : (
              <Button
                onClick={() => preview.rows.length > 0 && importMutatie.mutate(preview.rows)}
                disabled={preview.rows.length === 0 || importMutatie.isPending}
                data-testid="button-confirm-import"
              >
                {importMutatie.isPending ? "Bezig..." : `${preview.rows.length} rijen importeren`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Totaal binnengekomen</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totBinnengekomen.toLocaleString("nl")}</p>
            <p className="text-xs text-muted-foreground mt-1">t/m {maand} in geselecteerde periode</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Totaal afgehandeld</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totAfgehandeld.toLocaleString("nl")}</p>
            <p className="text-xs text-muted-foreground mt-1">t/m {maand} in geselecteerde periode</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Gem. kartografen</p>
            <p className="text-2xl font-bold">{gemKartografen.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">gemiddeld in periode</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Hoogste gem./kartograaf</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{maxGemiddeld.toLocaleString("nl", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
            <p className="text-xs text-muted-foreground mt-1">tienvoud, in periode</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Binnengekomen vs. Afgehandeld per jaar (t/m {maand})</CardTitle>
          <CardDescription className="text-xs">Staafdiagram — gecombineerd met gem. productie per kartograaf (tienvoud, rechteras)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: data.length * 38 + 80 }}>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data} margin={{ top: 8, right: 60, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(0)} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(val: number, name: string) => [
                      name === "Gem./kartograaf (×10)" ? val.toFixed(1) : val.toLocaleString("nl"),
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="binnengekomen" name="Binnengekomen" fill="#6366f1" radius={[3,3,0,0]} />
                  <Bar yAxisId="left" dataKey="afgehandeld"   name="Afgehandeld"   fill="#22c55e" radius={[3,3,0,0]} />
                  <Line yAxisId="right" type="monotone" dataKey="gemiddeld" name="Gem./kartograaf (×10)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Aantal kartografen per jaar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: data.length * 38 + 80 }}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={48} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, "auto"]} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(val: number) => [val, "Kartografen"]} />
                  <Bar dataKey="kartografen" name="Kartografen" fill="#8b5cf6" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Detailoverzicht t/m {maand} — {periode.label}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jaar</TableHead>
                <TableHead className="text-right">Binnengekomen</TableHead>
                <TableHead className="text-right">Afgehandeld</TableHead>
                <TableHead className="text-right">Verschil</TableHead>
                <TableHead className="text-right">Gem./kartograaf (×10)</TableHead>
                <TableHead className="text-right">Kartografen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const verschil = row.afgehandeld - row.binnengekomen;
                return (
                  <TableRow key={row.jaar} data-testid={`row-kartografie-${maand}-${row.jaar}`}>
                    <TableCell className="font-semibold">{row.jaar}</TableCell>
                    <TableCell className="text-right text-indigo-600 dark:text-indigo-400">{row.binnengekomen}</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">{row.afgehandeld}</TableCell>
                    <TableCell className="text-right">
                      <span className={verschil > 0 ? "text-green-600 dark:text-green-400" : verschil < 0 ? "text-red-500" : "text-muted-foreground"}>
                        {verschil > 0 ? "+" : ""}{verschil}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-amber-600 dark:text-amber-400">{row.gemiddeld.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{row.kartografen}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/40 font-semibold">
                <TableCell>Totaal/Gem.</TableCell>
                <TableCell className="text-right text-indigo-600 dark:text-indigo-400">{totBinnengekomen}</TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-400">{totAfgehandeld}</TableCell>
                <TableCell className="text-right">
                  <span className={totAfgehandeld - totBinnengekomen >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                    {totAfgehandeld - totBinnengekomen >= 0 ? "+" : ""}{totAfgehandeld - totBinnengekomen}
                  </span>
                </TableCell>
                <TableCell className="text-right text-amber-600 dark:text-amber-400">
                  {data.length ? (data.reduce((s, d) => s + d.gemiddeld, 0) / data.length).toFixed(1) : "—"}
                </TableCell>
                <TableCell className="text-right">{gemKartografen.toFixed(1)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


export default function ProductiePage() {
  const { data: productieFoto } = useQuery<{ value: string | null }>({
    queryKey: ["/api/site-settings", "productie_photo"],
    queryFn: async () => {
      const res = await fetch("/api/site-settings/productie_photo", { credentials: "include" });
      if (!res.ok) return { value: null };
      return res.json();
    },
  });

  return (
    <div className="overflow-auto h-full">
      <PageHero
        title="Productie"
        subtitle="Productiecijfers en grafieken per afdeling"
        imageSrc={productieFoto?.value || "/uploads/App_pics/rapporten.png"}
        imageAlt="productie"
      />
      <div className="p-6 space-y-5">
        <Tabs defaultValue="kartografie">
          <TabsList className="mb-5 flex-wrap h-auto gap-1">
            <TabsTrigger value="kartografie" data-testid="tab-kartografie">
              Trend KM Binnen
            </TabsTrigger>
            <TabsTrigger value="landmeters" data-testid="tab-landmeters">
              Trend KM Buiten
            </TabsTrigger>
            <TabsTrigger value="balie" data-testid="tab-balie">
              Trend KM Info
            </TabsTrigger>
            <TabsTrigger value="balie3" data-testid="tab-balie3">
              Trend OR Info
            </TabsTrigger>
            <TabsTrigger value="oralgem" data-testid="tab-oralgem">
              Trend OR Algemeen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kartografie">
            <KartografieTab />
          </TabsContent>

          <TabsContent value="landmeters">
            <LandmetersTab />
          </TabsContent>

          <TabsContent value="balie">
            <BalieMedewerkerTab />
          </TabsContent>

          <TabsContent value="balie3">
            <BalieM3Tab />
          </TabsContent>

          <TabsContent value="oralgem">
            <TrendOrAlgemeenTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
